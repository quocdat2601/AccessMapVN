"use client";

import { useCallback, useEffect, useState } from "react";
import { dashboardRepository, type DashboardData, type DateRangeKey } from "@/entities/dashboard";

export function useDashboardData(initialRange: DateRangeKey = "7d") {
  const [range, setRange] = useState<DateRangeKey>(initialRange);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const changeRange = useCallback((nextRange: DateRangeKey) => {
    setIsLoading(true);
    setError(null);
    setRange(nextRange);
  }, []);

  const retry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    dashboardRepository
      .getDashboard(range, controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError("Không thể tải dữ liệu vận hành. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [range, requestVersion]);

  return { range, setRange: changeRange, data, isLoading, error, retry };
}
