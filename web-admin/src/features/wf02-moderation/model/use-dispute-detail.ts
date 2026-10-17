"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatEtagFromVersion,
  wf02AdminRepository,
  type DisputeDecisionInput,
  type DisputeDetail,
} from "@/entities/wf02";
import { ApiError } from "@/shared/api/api-client";

export function useDisputeDetail(id: string) {
  const [data, setData] = useState<DisputeDetail | null>(null);
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
      .getDispute(id, controller.signal)
      .then((response) => {
        setData(response.data);
        setEtag(response.etag ?? formatEtagFromVersion(response.data.version));
        setError(null);
        setIsLoading(false);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Không thể tải tranh chấp.");
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [id, revision]);

  const decide = useCallback(
    async (input: DisputeDecisionInput) => {
      if (!etag) {
        setError("Phản hồi không có ETag nên chưa thể ghi quyết định an toàn.");
        return false;
      }
      setIsMutating(true);
      setError(null);
      setConflict(false);
      try {
        const response = await wf02AdminRepository.decideDispute(id, input, etag);
        setEtag(response.etag ?? formatEtagFromVersion(response.data.version));
        reload();
        return true;
      } catch (reason) {
        if (reason instanceof ApiError && reason.isConcurrencyConflict) {
          setConflict(true);
          setError("Tranh chấp đã được quản trị viên khác cập nhật. Dữ liệu mới nhất đang được tải lại.");
          reload();
          return false;
        }
        setError(reason instanceof Error ? reason.message : "Không thể lưu quyết định.");
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [etag, id, reload],
  );

  return { data, etag, error, conflict, isLoading, isMutating, reload, decide };
}
