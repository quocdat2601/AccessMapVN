"use client";

import { useEffect, useState } from "react";
import { contributionRepository, type ContributionQueueQuery, type ContributionQueueResponse } from "@/entities/contribution";

export function useContributionQueue(query: ContributionQueueQuery) {
  const [data, setData] = useState<ContributionQueueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    contributionRepository.getQueue(query, controller.signal)
      .then((response) => { setData(response); setError(null); })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError("Không thể tải danh sách hồ sơ. Vui lòng thử lại.");
      });
    return () => controller.abort();
  }, [query]);

  return { data, error, isLoading: !data && !error };
}
