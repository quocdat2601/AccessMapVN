"use client";

import { useCallback, useEffect, useState } from "react";
import {
  wf02AdminRepository,
  type AdminQueueQuery,
  type AdminQueueResponse,
  type CommunityCommentQueueItem,
  type DisputeQueueItem,
  type ReportQueueItem,
} from "@/entities/wf02";
import { ApiError } from "@/shared/api/api-client";

type QueueKind = "disputes" | "reports" | "comments";
type QueueItemByKind = {
  disputes: DisputeQueueItem;
  reports: ReportQueueItem;
  comments: CommunityCommentQueueItem;
};

function errorMessage(reason: unknown) {
  if (reason instanceof ApiError && reason.status === 403) {
    return "Tài khoản không có quyền Wf02.Moderate.";
  }
  return reason instanceof Error ? reason.message : "Không thể tải hàng đợi kiểm duyệt.";
}

export function useModerationQueue<K extends QueueKind>(kind: K, query: AdminQueueQuery) {
  const [data, setData] = useState<AdminQueueResponse<QueueItemByKind[K]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const operation =
      kind === "disputes"
        ? wf02AdminRepository.getDisputes(query, controller.signal)
        : kind === "reports"
          ? wf02AdminRepository.getReports(query, controller.signal)
          : wf02AdminRepository.getComments(query, controller.signal);

    void operation
      .then((response) => {
        setData(response as AdminQueueResponse<QueueItemByKind[K]>);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(errorMessage(reason));
      });

    return () => controller.abort();
  }, [kind, query, revision]);

  const reload = useCallback(() => {
    setData(null);
    setError(null);
    setRevision((value) => value + 1);
  }, []);
  return { data, error, isLoading: !data && !error, reload };
}
