"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatEtagFromVersion,
  wf02AdminRepository,
  type MetadataCorrectionInput,
  type ReportDetail,
  type ReportTransitionInput,
} from "@/entities/wf02";
import { ApiError } from "@/shared/api/api-client";

export function useReportDetail(id: string) {
  const [data, setData] = useState<ReportDetail | null>(null);
  const [etag, setEtag] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void wf02AdminRepository
      .getReport(id, controller.signal)
      .then((response) => {
        setData(response.data);
        setEtag(response.etag ?? formatEtagFromVersion(response.data.version));
        setError(null);
        setIsLoading(false);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Không thể tải báo cáo.");
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [id, revision]);

  const mutate = useCallback(
    async (
      operation: (currentEtag: string) => Promise<{
        data: { version: number };
        etag?: string;
      }>,
    ) => {
      if (!etag) {
        setError("Phản hồi không có ETag nên chưa thể cập nhật an toàn.");
        return false;
      }
      setIsMutating(true);
      setError(null);
      setConflict(false);
      try {
        const response = await operation(etag);
        setEtag(response.etag ?? formatEtagFromVersion(response.data.version));
        reload();
        return true;
      } catch (reason) {
        if (reason instanceof ApiError && reason.isConcurrencyConflict) {
          setConflict(true);
          setError("Báo cáo đã được quản trị viên khác cập nhật. Dữ liệu mới nhất đang được tải lại.");
          reload();
          return false;
        }
        setError(reason instanceof Error ? reason.message : "Không thể cập nhật báo cáo.");
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [etag, reload],
  );

  return {
    data,
    etag,
    error,
    conflict,
    isLoading,
    isMutating,
    reload,
    transition: (input: ReportTransitionInput) =>
      mutate((currentEtag) => wf02AdminRepository.transitionReport(id, input, currentEtag)),
    correctMetadata: (input: MetadataCorrectionInput) => {
      if (!data) return Promise.resolve(false);
      return mutate((currentEtag) =>
        wf02AdminRepository.correctMetadata(data.locationId, input, currentEtag),
      );
    },
  };
}
