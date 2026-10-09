"use client";

import { useCallback, useEffect, useState } from "react";
import { contributionRepository, type ApproveContributionInput, type ContributionDetail, type ContributionNavigation, type RequestMoreInfoInput } from "@/entities/contribution";

export function useContributionDetail(id: string) {
  const [data, setData] = useState<ContributionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [navigation, setNavigation] = useState<ContributionNavigation | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    contributionRepository.getById(id, controller.signal)
      .then((response) => response ? setData(response) : setError("Không tìm thấy hồ sơ đóng góp."))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError("Không thể tải chi tiết hồ sơ.");
      });
    contributionRepository.getNavigation(id).then(setNavigation);
    return () => controller.abort();
  }, [id]);

  const runMutation = useCallback(async (operation: () => Promise<ContributionDetail>) => {
    setIsMutating(true);
    setError(null);
    try {
      const next = await operation();
      setData(next);
      return next;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật hồ sơ.");
      throw reason;
    } finally {
      setIsMutating(false);
    }
  }, []);

  return {
    data,
    error,
    isLoading: !data && !error,
    isMutating,
    navigation,
    approve: (input: ApproveContributionInput) => runMutation(() => contributionRepository.approve(id, input)),
    requestMoreInfo: (input: RequestMoreInfoInput) => runMutation(() => contributionRepository.requestMoreInfo(id, input)),
    reject: (reason: string) => runMutation(() => contributionRepository.reject(id, reason)),
    sendReminder: () => runMutation(() => contributionRepository.sendReminder(id)),
  };
}
