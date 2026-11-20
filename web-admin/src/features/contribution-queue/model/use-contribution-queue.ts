"use client";

import { useCallback, useEffect, useState } from "react";
import { contributionRepository, type ContributionQueueQuery, type ContributionQueueResponse } from "@/entities/contribution";

export function useContributionQueue(query: ContributionQueueQuery) {
  const [data, setData] = useState<ContributionQueueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    if (data) setIsRefreshing(true);
    contributionRepository.getQueue(query, controller.signal)
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError("Không thể tải danh sách hồ sơ. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsRefreshing(false);
      });
    return () => controller.abort();
  }, [query, refreshTick]);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  return { data, error, isLoading: !data && !error, isRefreshing, refresh };
}
