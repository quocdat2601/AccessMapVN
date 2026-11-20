"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import {
  featureLabels,
  formatAdminDate,
  reportReasonLabels,
  reportStatusLabels,
  type ReportDecision,
  type ReportResolution,
} from "@/entities/community-moderation";
import { useReportDetail } from "@/features/community-moderation/model/use-report-detail";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";

const decisions: ReportDecision[] = ["StartReview", "RequestEvidence", "LinkDispute", "Resolve", "Reject"];
const decisionLabels: Record<ReportDecision, string> = {
  StartReview: "Bắt đầu xem xét",
  RequestEvidence: "Yêu cầu bổ sung minh chứng",
  LinkDispute: "Liên kết hồ sơ tranh chấp",
  Resolve: "Hoàn tất xử lý",
  Reject: "Từ chối báo cáo",
};
const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

export function ReportDetailPage({ id }: { id: string }) {
  const detail = useReportDetail(id);
  const [decision, setDecision] = useState<ReportDecision>("StartReview");
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState<ReportResolution>("BaselineRetained");
  const [linkedId, setLinkedId] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  async function transition(event: FormEvent) {
    event.preventDefault();
    if (!detail.data) return;
    await detail.transition({
      decision,
      note: note.trim(),
      expectedVersion: detail.data.version,
      resolution: decision === "Resolve" ? resolution : undefined,
      linkedDisputeCaseId: decision === "LinkDispute" ? linkedId.trim() || undefined : undefined,
      linkedSubmissionId: resolution === "CorrectionPublished" ? linkedId.trim() || undefined : undefined,
    });
  }

  async function correctMetadata(event: FormEvent) {
    event.preventDefault();
    if (!detail.data?.locationMetadataVersion) return;
    await detail.correctMetadata({
      expectedMetadataVersion: detail.data.locationMetadataVersion,
      sourceReportId: detail.data.id,
      reason: note.trim(),
      proposedAddress: address.trim() || undefined,
      proposedPosition:
        latitude && longitude
          ? { latitude: Number(latitude), longitude: Number(longitude) }
          : undefined,
    });
  }

  if (detail.isLoading)
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10" />
        <Skeleton className="h-72" />
      </div>
    );
  if (!detail.data)
    return (
      <div className="p-6">
        <EmptyState
          title="Không tải được báo cáo"
          description={detail.error ?? "Không tìm thấy báo cáo."}
        />
      </div>
    );
  const data = detail.data;

  return (
    <div className="mx-auto w-full max-w-[1300px] space-y-4 p-4 sm:p-6">
      <Link
        href="/admin/bao-cao-sai-lech"
        className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700"
      >
        <ArrowLeft className="size-4" /> Quay lại hàng đợi
      </Link>
      <header>
        <p className="text-xs font-semibold text-teal-700">Báo cáo sai lệch · v{data.version}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-950">
          {data.locationName || data.locationId}
        </h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="red">{reportReasonLabels[data.reason]}</Badge>
          <Badge variant="blue">{reportStatusLabels[data.status]}</Badge>
          {data.featureType && (
            <Badge>
              {featureLabels[data.featureType]}
              {data.observedFeatureVersion ? ` · v${data.observedFeatureVersion}` : ""}
            </Badge>
          )}
        </div>
      </header>
      {detail.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {detail.error}
        </div>
      )}
      {detail.conflict && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Phiên bản dữ liệu đã thay đổi; trang đang tải lại dữ liệu mới.
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nội dung người dùng gửi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="whitespace-pre-wrap text-slate-800">{data.description}</p>
              <p className="text-xs text-slate-500">
                Gửi lúc {formatAdminDate(data.createdAt)} ·{" "}
                {data.reporterDisplayName ?? "Người báo cáo"}
              </p>
              {data.proposedAddress && (
                <p className="rounded-lg bg-amber-50 p-2 text-amber-900">
                  Địa chỉ đề xuất: {data.proposedAddress}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Minh chứng thực địa & Phân tích AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.evidence.length ? (
                data.evidence.map((item) => (
                  <div
                    key={item.id}
                    className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    {item.mediaUrl && (
                      <div className="relative flex max-h-[360px] w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-900/5">
                        <img
                          src={item.mediaUrl}
                          alt="Minh chứng báo cáo"
                          className="max-h-[360px] w-full object-contain"
                        />
                      </div>
                    )}
                    <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="flex size-2 animate-pulse rounded-full bg-teal-600" />
                          <span className="text-xs font-bold uppercase tracking-wide text-teal-800">
                            Đánh giá AI từ Mobile
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {formatAdminDate(item.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {item.description ||
                          "Tệp minh chứng đã được AI thẩm định độ tin cậy."}
                      </p>
                    </div>
                    {item.mediaUrl && (
                      <div className="flex justify-end">
                        <a
                          href={item.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline"
                        >
                          <ExternalLink className="size-3.5" /> Mở ảnh gốc (Cloud CDN)
                        </a>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Chưa có minh chứng bổ sung.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử trạng thái</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.history.map((item) => (
                <div key={item.id} className="border-l-2 border-teal-200 pl-3 text-sm">
                  <strong>{reportStatusLabels[item.toStatus]}</strong>
                  <p className="text-slate-600">{item.reason}</p>
                  <span className="text-xs text-slate-400">
                    {formatAdminDate(item.occurredAt)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chuyển trạng thái</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={transition}>
                <select
                  className={inputClass}
                  value={decision}
                  onChange={(event) => setDecision(event.target.value as ReportDecision)}
                >
                  {decisions.map((value) => (
                    <option key={value} value={value}>
                      {decisionLabels[value]}
                    </option>
                  ))}
                </select>
                <textarea
                  required
                  className="min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm"
                  placeholder="Ghi chú / lý do bắt buộc"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                {decision === "Resolve" && (
                  <select
                    className={inputClass}
                    value={resolution}
                    onChange={(event) =>
                      setResolution(event.target.value as ReportResolution)
                    }
                  >
                    <option value="BaselineRetained">Giữ nguyên dữ liệu gốc</option>
                    <option value="AdvisoryCreated">Tạo cảnh báo tạm thời</option>
                    <option value="CorrectionPublished">Đã công bố bản sửa đổi</option>
                  </select>
                )}
                {(decision === "LinkDispute" || resolution === "CorrectionPublished") && (
                  <input
                    className={inputClass}
                    placeholder="Mã UUID Tranh chấp / Hồ sơ đóng góp"
                    value={linkedId}
                    onChange={(event) => setLinkedId(event.target.value)}
                  />
                )}
                <Button
                  className="w-full"
                  disabled={detail.isMutating || !note.trim()}
                  type="submit"
                >
                  <ShieldCheck className="size-4" /> Lưu trạng thái
                </Button>
              </form>
            </CardContent>
          </Card>
          {data.reason === "WrongAddressOrPin" && (
            <Card>
              <CardHeader>
                <CardTitle>Sửa thông tin vị trí (Metadata)</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={correctMetadata}>
                  <input
                    className={inputClass}
                    placeholder={data.currentAddress || "Địa chỉ mới"}
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      placeholder="Vĩ độ (Latitude)"
                      value={latitude}
                      onChange={(event) => setLatitude(event.target.value)}
                    />
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      placeholder="Kinh độ (Longitude)"
                      value={longitude}
                      onChange={(event) => setLongitude(event.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={!data.locationMetadataVersion || !note.trim()}
                    type="submit"
                  >
                    <MapPin className="size-4" /> Áp dụng cập nhật vị trí
                  </Button>
                  <p className="text-xs text-slate-500">
                    Phiên bản metadata hiện tại: {data.locationMetadataVersion ?? "không có"}
                  </p>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
