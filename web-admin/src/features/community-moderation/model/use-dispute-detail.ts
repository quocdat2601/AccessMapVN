"use client";

import { useCallback, useEffect, useState } from "react";
import {
  communityModerationRepository,
  formatEtagFromVersion,
  type DisputeDecisionInput,
  type DisputeDetail,
  type DisputeRelatedReport,
} from "@/entities/community-moderation";
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

    async function load() {
      try {
        const response = await communityModerationRepository.getDispute(id, controller.signal);
        const dispute = response.data;

        let relatedReports: DisputeRelatedReport[] = dispute.relatedReports ?? [];
        if (relatedReports.length === 0 && dispute.locationId) {
          try {
            const reportsQueue = await communityModerationRepository.getReports(
              { page: 1, pageSize: 30 },
              controller.signal,
            );
            const matchingItems = reportsQueue.items.filter(
              (r) =>
                r.locationId === dispute.locationId &&
                (!r.featureType || r.featureType === dispute.featureType),
            );
            const fullReports = await Promise.all(
              matchingItems.slice(0, 6).map(async (item) => {
                try {
                  const detailResp = await communityModerationRepository.getReport(
                    item.id,
                    controller.signal,
                  );
                  const d = detailResp.data;
                  return {
                    id: d.id,
                    reporterDisplayName: d.reporterDisplayName || "Người báo cáo thực địa",
                    reason: d.reason,
                    description: d.description,
                    status: d.status,
                    createdAt: d.createdAt,
                    evidence: d.evidence ?? [],
                  } satisfies DisputeRelatedReport;
                } catch {
                  return {
                    id: item.id,
                    reporterDisplayName: "Người báo cáo thực địa",
                    reason: item.reason,
                    description: item.description,
                    status: item.status,
                    createdAt: item.createdAt,
                    evidence: [],
                  } satisfies DisputeRelatedReport;
                }
              }),
            );
            relatedReports = fullReports;
          } catch {}
        }

        setData({ ...dispute, relatedReports });
        setEtag(response.etag ?? formatEtagFromVersion(dispute.version));
        setError(null);
        setIsLoading(false);
      } catch (reason: unknown) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Không thể tải tranh chấp.");
        setIsLoading(false);
      }
    }

    void load();
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
        const response = await communityModerationRepository.decideDispute(id, input, etag);
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
