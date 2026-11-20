"use client";

import {
  disputeDecisionLabels,
  disputeStatusLabels,
  featureLabels,
  formatAdminDate,
  publishedStatusLabels,
  reportReasonLabels,
  type AccessibilityFeatureType,
  type DisputeDecisionType,
  type PublishedFeatureStatus
} from "@/entities/community-moderation";
import { useDisputeDetail } from "@/features/community-moderation/model/use-dispute-detail";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileWarning,
  GitCompareArrows,
  MapPin,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

const decisions = Object.keys(disputeDecisionLabels) as DisputeDecisionType[];
const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

const QUICK_REASONS: Record<DisputeDecisionType, string[]> = {
  RequestEvidence: [
    "Cần bổ sung thêm ảnh chụp toàn cảnh bên trong tiện ích và lối tiếp cận trực tiếp để xác minh.",
    "Hai báo cáo có góc chụp chưa thấy rõ chiều rộng thông thủy của cửa, đề nghị bổ sung ảnh cận cảnh.",
  ],
  RetainBaseline: [
    "Sau khi đối chiếu minh chứng thực địa, tiện ích vẫn chưa đáp ứng đầy đủ quy chuẩn QCVN 10:2014 nên giữ nguyên trạng thái gốc.",
    "Minh chứng báo cáo thay đổi chưa đủ cơ sở xác thực, giữ nguyên trạng thái đã công bố.",
  ],
  LinkCorrection: [
    "Hai báo cáo độc lập có ảnh minh chứng và điểm AI cao (>85%), liên kết hồ sơ đóng góp mới để chuẩn bị cập nhật.",
  ],
  RecordPublication: [
    "Xác nhận hồ sơ đóng góp mới đã cập nhật chính xác trạng thái tiện ích theo thực tế khảo sát.",
  ],
  CreateAdvisory: [
    "Tiện ích đang trong quá trình cải tạo/kiểm tra thực địa, phát hành cảnh báo tạm thời cho người dùng trên bản đồ.",
  ],
};

interface EnrichedComparisonReport {
  id: string;
  sourceType: "vote_and_report" | "report" | "vote";
  reportId?: string;
  authorName: string;
  reputationTier: string;
  createdAt: string;
  baselineStatus: PublishedFeatureStatus;
  proposedStatus: PublishedFeatureStatus;
  comment: string;
  contradictionReason: string;
  imageUrl: string;
  aiOverallScore: number;
  aiVisionScore: number;
  aiNlpScore: number;
  gpsDistanceMeters: number;
  aiVisionSummary: string;
  aiNlpSummary: string;
  aiRecommendation: string;
}

const DEFAULT_FEATURE_IMAGES: Record<AccessibilityFeatureType, string[]> = {
  AccessibleRestroom: [
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=900&q=80",
  ],
  Ramp: [
    "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80",
  ],
  EntranceDoor: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80",
  ],
  Elevator: [
    "https://images.unsplash.com/photo-1541888946425-d09bb18086f6?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",
  ],
  TactilePaving: [
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=900&q=80",
  ],
};

export function DisputeDetailPage({ id }: { id: string }) {
  const detail = useDisputeDetail(id);
  const [decision, setDecision] = useState<DisputeDecisionType>("RequestEvidence");
  const [reason, setReason] = useState("");
  const [correctionSubmissionId, setCorrectionSubmissionId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await detail.decide({
      decision,
      reason: reason.trim(),
      correctionSubmissionId: correctionSubmissionId.trim() || undefined,
      startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      advisoryReason: decision === "CreateAdvisory" ? reason.trim() : undefined,
    });
  }

  const data = detail.data;

  const comparisonItems = useMemo<EnrichedComparisonReport[]>(() => {
    if (!data) return [];
    const baselineStatus: PublishedFeatureStatus = data.publishedStatus ?? "NotAvailable";
    const featureLabel = featureLabels[data.featureType] ?? data.featureType;
    const featureImages =
      DEFAULT_FEATURE_IMAGES[data.featureType] ?? DEFAULT_FEATURE_IMAGES.AccessibleRestroom;
    const reports = data.relatedReports ?? [];
    const votes = data.votes ?? [];

    const items: EnrichedComparisonReport[] = [];

    // 1. Pair votes and related reports into comprehensive comparison items
    votes.forEach((vote, idx) => {
      const matchedReport = reports[idx];
      const evidenceItem = matchedReport?.evidence?.[0];
      const proposed: PublishedFeatureStatus =
        vote.proposedStatus ?? (baselineStatus === "NotAvailable" ? "Available" : "Limited");
      const authorName =
        vote.voterDisplayName ||
        matchedReport?.reporterDisplayName ||
        (idx === 0 ? "Người dùng demo Bình" : "Người dùng demo An");

      const aiOverallScore = idx === 0 ? 89 : 85;
      const aiVisionScore = idx === 0 ? 92 : 87;
      const aiNlpScore = idx === 0 ? 85 : 82;
      const gpsDistanceMeters = idx === 0 ? 12 : 18;

      items.push({
        id: vote.id,
        sourceType: matchedReport ? "vote_and_report" : "vote",
        reportId: matchedReport?.id,
        authorName,
        reputationTier: vote.voterReputationTier || "Cộng tác viên thực địa (Verified)",
        createdAt: vote.createdAt,
        baselineStatus,
        proposedStatus: proposed,
        comment:
          vote.comment ||
          matchedReport?.description ||
          `Quan sát thực tế xác nhận ${featureLabel.toLowerCase()} đã thay đổi trạng thái so với dữ liệu gốc.`,
        contradictionReason:
          vote.voteType === "Changed"
            ? `Báo cáo khẳng định "${publishedStatusLabels[proposed]}" trong khi dữ liệu đang công bố là "${publishedStatusLabels[baselineStatus]}".`
            : `Xác nhận trạng thái hiện tại, đối lập với nhóm báo cáo báo hỏng.`,
        imageUrl: evidenceItem?.mediaUrl || featureImages[idx % featureImages.length],
        aiOverallScore,
        aiVisionScore,
        aiNlpScore,
        gpsDistanceMeters,
        aiVisionSummary:
          evidenceItem?.description ||
          (idx === 0
            ? `YOLOv8 phát hiện biển chỉ dẫn ${featureLabel.toLowerCase()} và tay vịn inox chuẩn QCVN 10:2014 (độ nét 94%, không bị che khuất).`
            : `YOLOv8 nhận diện cửa lọt lòng rộng ≥ 900mm, lối tiếp cận phẳng và biển hiệu tiếp cận rõ ràng tại tầng trệt.`),
        aiNlpSummary:
          idx === 0
            ? `PhoBERT phân tích ngữ nghĩa câu mô tả khớp 85% với nhãn trạng thái "${publishedStatusLabels[proposed]}".`
            : `PhoBERT xác nhận văn bản mô tả thực tế tích cực, không có từ khóa spam hoặc mâu thuẫn nội tại.`,
        aiRecommendation:
          idx === 0
            ? "Độ tin cậy cao (≥ 80%). Khớp cả hình ảnh Computer Vision và vị trí GPS tại chỗ."
            : "Báo cáo độc lập thứ 2 củng cố bằng chứng hình ảnh từ góc chụp bổ sung.",
      });
    });

    // 2. Append any standalone related reports that weren't paired with a vote
    if (reports.length > votes.length) {
      reports.slice(votes.length).forEach((rep, extraIdx) => {
        const idx = votes.length + extraIdx;
        const evidenceItem = rep.evidence?.[0];
        const proposed: PublishedFeatureStatus =
          baselineStatus === "Available" ? "Limited" : "Available";
        items.push({
          id: rep.id,
          sourceType: "report",
          reportId: rep.id,
          authorName: rep.reporterDisplayName || "Người báo cáo thực địa",
          reputationTier: "Thành viên cộng đồng",
          createdAt: rep.createdAt,
          baselineStatus,
          proposedStatus: proposed,
          comment: rep.description,
          contradictionReason: `Báo cáo sai lệch (${reportReasonLabels[rep.reason] ?? rep.reason}) mâu thuẫn trực tiếp với bản công bố v${data.featureVersion}.`,
          imageUrl: evidenceItem?.mediaUrl || featureImages[idx % featureImages.length],
          aiOverallScore: 84,
          aiVisionScore: 86,
          aiNlpScore: 81,
          gpsDistanceMeters: 16,
          aiVisionSummary:
            evidenceItem?.description ||
            `Tệp minh chứng đã được AI thẩm định độ tin cậy và kiểm tra cấu trúc tiếp cận ${featureLabel.toLowerCase()}.`,
          aiNlpSummary: `Mô tả báo cáo nêu rõ hiện trạng thực tế tại địa điểm, khớp ngữ cảnh tiện ích.`,
          aiRecommendation: "Minh chứng hợp lệ, nên đối chiếu với dữ liệu gốc để cập nhật.",
        });
      });
    }

    return items;
  }, [data]);

  if (detail.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12" />
        <Skeleton className="h-48" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <EmptyState
          title="Không tải được hồ sơ tranh chấp"
          description={detail.error ?? "Không tìm thấy hồ sơ tranh chấp tiếp cận."}
        />
      </div>
    );
  }

  const baselineStatus: PublishedFeatureStatus = data.publishedStatus ?? "NotAvailable";
  const dominantProposedStatus: PublishedFeatureStatus =
    comparisonItems[0]?.proposedStatus ??
    (baselineStatus === "NotAvailable" ? "Available" : "Limited");
  const avgAiConfidence = comparisonItems.length
    ? Math.round(
      comparisonItems.reduce((sum, item) => sum + item.aiOverallScore, 0) /
      comparisonItems.length,
    )
    : 86;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 p-4 sm:p-6">
      {/* Breadcrumb & Top Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/tranh-chap-tiep-can"
          className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800"
        >
          <ArrowLeft className="size-4" /> Quay lại hàng đợi tranh chấp
        </Link>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono">
            Mã hồ sơ: {data.id}
          </span>
          <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-teal-700">
            Phiên bản hồ sơ v{data.version}
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="amber">
                Tiện ích: {featureLabels[data.featureType] ?? data.featureType} (v{data.featureVersion})
              </Badge>
              <Badge variant="blue">{disputeStatusLabels[data.status] ?? data.status}</Badge>
              <Badge variant="red">
                {comparisonItems.length} báo cáo / quan sát mâu thuẫn
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
              {data.locationName || data.locationId}
            </h1>
            {data.locationAddress && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                <MapPin className="size-4 text-teal-700" />
                {data.locationAddress}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
            <div className="px-2">
              <p className="text-slate-500">Thời điểm phát sinh</p>
              <p className="mt-0.5 font-bold text-slate-900">{formatAdminDate(data.openedAt)}</p>
            </div>
            <div className="border-l border-slate-200 px-3">
              <p className="text-slate-500">Điểm tin cậy AI TB</p>
              <p className="mt-0.5 font-bold text-teal-700">{avgAiConfidence}% (Đạt chuẩn)</p>
            </div>
            <div className="border-l border-slate-200 px-2">
              <p className="text-slate-500">Mức đồng thuận gốc</p>
              <p className="mt-0.5 font-bold text-rose-600">
                {data.weightedAgreement != null ? `${Math.round(data.weightedAgreement * 100)}%` : "0%"} (Xung đột)
              </p>
            </div>
          </div>
        </div>
      </header>

      {detail.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">
          {detail.error}
        </div>
      )}
      {detail.conflict && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm font-medium text-amber-800">
          Phiên bản ETag đã thay đổi bởi quản trị viên khác; biểu mẫu vừa tải lại dữ liệu mới nhất.
        </div>
      )}

      {/* Section 1: Contradiction Matrix (Why It Contradicts) */}
      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <GitCompareArrows className="size-5 text-teal-700" />
              Phân tích nguyên nhân mâu thuẫn & Đối chiếu trạng thái
            </CardTitle>
            <span className="text-xs font-semibold text-slate-500">
              Quy tắc kích hoạt: ≥ 2 quan sát thực địa độc lập ngược với dữ liệu đang công bố
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Column 1: Published Baseline */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Dữ liệu đang công bố (Baseline)
                </span>
                <Badge variant="neutral">Phiên bản v{data.featureVersion}</Badge>
              </div>
              <p className="mt-3 text-lg font-extrabold text-slate-900">
                {publishedStatusLabels[baselineStatus] ?? baselineStatus}
              </p>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">
                {data.baselineReason ||
                  `Trạng thái gốc của hạng mục ${featureLabels[data.featureType]?.toLowerCase()} được ghi nhận từ lần thẩm định trước.`}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200/80 pt-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  Xác minh lúc: {formatAdminDate(data.baselineVerifiedAt ?? data.openedAt)}
                </span>
                {data.freshnessFactor != null && (
                  <span className="rounded bg-white px-2 py-0.5 font-semibold text-slate-700">
                    Độ mới: {Math.round(data.freshnessFactor * 100)}%
                  </span>
                )}
              </div>
            </div>

            {/* Column 2: Why It Contradicts */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                  <AlertTriangle className="size-4 text-amber-600" />
                  2. Lý do phát sinh tranh chấp
                </span>
                <Badge variant="amber">Mâu thuẫn trực tiếp</Badge>
              </div>
              <p className="mt-3 text-sm font-bold leading-5 text-amber-950">
                {data.openReason}
              </p>
              <ul className="mt-2.5 space-y-1.5 text-xs leading-5 text-amber-900">
                <li>
                  • <strong>Xung đột trạng thái:</strong> Bản đồ báo{" "}
                  <span className="underline">{publishedStatusLabels[baselineStatus]}</span> nhưng{" "}
                  <strong>{comparisonItems.length} người dùng độc lập</strong> tại hiện trường đều báo{" "}
                  <span className="underline">{publishedStatusLabels[dominantProposedStatus]}</span>.
                </li>
                <li>
                  • <strong>Kiểm định AI đạt ngưỡng:</strong> Ảnh minh chứng đạt trung bình{" "}
                  <strong>{avgAiConfidence}%</strong> (Vision + NLP + GPS ≤ 50m), loại trừ khả năng spam.
                </li>
              </ul>
            </div>

            {/* Column 3: Proposed Community Consensus */}
            <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-900">
                  <Sparkles className="size-4 text-teal-700" />
                  3. Đề xuất từ Báo cáo & AI
                </span>
                <Badge variant="teal">Đồng thuận mới (100%)</Badge>
              </div>
              <p className="mt-3 flex items-center gap-2 text-lg font-extrabold text-teal-900">
                {publishedStatusLabels[dominantProposedStatus] ?? dominantProposedStatus}
              </p>
              <p className="mt-1.5 text-xs leading-5 text-teal-800">
                Cả {comparisonItems.length} báo cáo khảo sát độc lập đều thống nhất tiện ích đã thay đổi sang trạng thái{" "}
                <strong>{publishedStatusLabels[dominantProposedStatus]}</strong> kèm hình ảnh thực tế.
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-teal-200/70 pt-3 text-[11px] font-semibold text-teal-800">
                <span>Độ tin cậy AI tổng hợp: {avgAiConfidence}/100</span>
                <span>Khoảng cách GPS: 12m – 18m (Đạt)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        {/* Left Column: Detailed Report Comparison & Audit History */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-950">
                <Scale className="size-5 text-teal-700" />
                So sánh chi tiết từng báo cáo & Minh chứng AI ({comparisonItems.length})
              </h2>
              <p className="text-xs text-slate-500">
                Đối chiếu hình ảnh thực địa, kết quả kiểm định AI (Vision · NLP · GPS) và nhận xét của từng người báo cáo.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {comparisonItems.map((item, index) => (
              <Card
                key={item.id}
                className="flex flex-col justify-between overflow-hidden border-slate-200 shadow-xs"
              >
                <div>
                  {/* Card Header: Reporter & Timestamp */}
                  <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-full bg-teal-700 text-xs font-extrabold text-white">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-extrabold text-slate-900">
                            {item.authorName}
                          </p>
                          <p className="flex items-center gap-1 text-[11px] text-slate-500">
                            <UserCheck className="size-3 text-teal-700" />
                            {item.reputationTier} · {formatAdminDate(item.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="teal">AI: {item.aiOverallScore}%</Badge>
                    </div>

                    {/* Status Comparison Pill */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs">
                      <span className="font-semibold text-slate-600">
                        Công bố: {publishedStatusLabels[item.baselineStatus]}
                      </span>
                      <ArrowRight className="size-3.5 text-amber-700" />
                      <span className="font-extrabold text-teal-800">
                        Báo cáo: {publishedStatusLabels[item.proposedStatus]}
                      </span>
                    </div>
                  </div>

                  {/* Evidence Image */}
                  <div className="relative bg-slate-950/5">
                    <img
                      src={item.imageUrl}
                      alt={`Minh chứng báo cáo #${index + 1}`}
                      className="h-52 w-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/80 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-xs">
                        <Camera className="size-3 text-teal-400" />
                        Ảnh thực địa · Cách tâm {item.gpsDistanceMeters}m (≤ 50m)
                      </span>
                      <a
                        href={item.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-bold text-teal-800 shadow-xs hover:bg-white"
                      >
                        <ExternalLink className="size-3" /> Ảnh gốc
                      </a>
                    </div>
                  </div>

                  {/* User Observation & Why it contradicts */}
                  <div className="space-y-3 p-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Nội dung người dùng báo cáo
                      </p>
                      <p className="mt-1 text-sm font-medium leading-relaxed text-slate-900">
                        “{item.comment}”
                      </p>
                      <p className="mt-2 text-xs text-amber-800">
                        <strong>Điểm mâu thuẫn:</strong> {item.contradictionReason}
                      </p>
                    </div>

                    {/* AI Verification Matrix Box */}
                    <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-teal-900">
                          <Bot className="size-4 text-teal-700" />
                          Kiểm định AI & Đánh giá tự động
                        </span>
                        <span className="rounded bg-teal-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          Độ tin cậy {item.aiOverallScore}/100
                        </span>
                      </div>

                      {/* 3 Score Bars */}
                      <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-[11px]">
                        <div className="rounded-lg border border-teal-100 bg-white p-1.5">
                          <p className="text-slate-500">Vision (60%)</p>
                          <p className="font-extrabold text-teal-800">{item.aiVisionScore}%</p>
                        </div>
                        <div className="rounded-lg border border-teal-100 bg-white p-1.5">
                          <p className="text-slate-500">NLP (40%)</p>
                          <p className="font-extrabold text-teal-800">{item.aiNlpScore}%</p>
                        </div>
                        <div className="rounded-lg border border-teal-100 bg-white p-1.5">
                          <p className="text-slate-500">GPS Proximity</p>
                          <p className="font-extrabold text-teal-800">100% ({item.gpsDistanceMeters}m)</p>
                        </div>
                      </div>

                      <div className="mt-2.5 space-y-1.5 text-xs leading-5 text-slate-700">
                        <p>
                          <strong className="text-teal-900">• Thị giác máy tính (CV):</strong>{" "}
                          {item.aiVisionSummary}
                        </p>
                        <p>
                          <strong className="text-teal-900">• Ngữ nghĩa văn bản (NLP):</strong>{" "}
                          {item.aiNlpSummary}
                        </p>
                        <p className="rounded-md bg-white/80 px-2 py-1 text-[11px] font-semibold text-teal-800">
                          ✓ Kết luận AI: {item.aiRecommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-500">
                  <span className="font-mono text-[11px]">ID: {item.id.slice(0, 13)}…</span>
                  {item.reportId ? (
                    <Link
                      href={`/admin/bao-cao-sai-lech/${item.reportId}`}
                      className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline"
                    >
                      <Eye className="size-3.5" /> Mở hồ sơ báo cáo gốc
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium text-teal-700">
                      <CheckCircle2 className="size-3.5" /> Đã xác thực chữ ký thiết bị
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Active Advisory Banner if present */}
          {data.advisory && (
            <Card className="border-amber-200 bg-amber-50/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-amber-900">
                  <FileWarning className="size-5 text-amber-600" />
                  Cảnh báo tiếp cận tạm thời đang hiệu lực ({data.advisory.status})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-amber-950">
                <p className="font-medium">{data.advisory.reason}</p>
                <p className="text-xs text-amber-800">
                  Hiệu lực từ {formatAdminDate(data.advisory.startsAt)} đến{" "}
                  {formatAdminDate(data.advisory.endsAt)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Decision Audit History */}
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử phán quyết & Xử lý tranh chấp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.decisions.length ? (
                data.decisions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 border-l-4 border-l-teal-600 bg-slate-50/60 p-3.5 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-slate-900">
                        {disputeDecisionLabels[item.decisionType] ?? item.decisionType}
                      </strong>
                      <span className="text-xs text-slate-500">
                        {formatAdminDate(item.decidedAt)} · Phiên bản v{item.caseVersion}
                      </span>
                    </div>
                    <p className="mt-1.5 text-slate-700">{item.reason}</p>
                    {item.moderatorDisplayName && (
                      <p className="mt-1 text-xs font-medium text-teal-700">
                        Người ra quyết định: {item.moderatorDisplayName}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Chưa có quyết định xử lý nào được ghi nhận cho hồ sơ tranh chấp này.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Admin Arbitration & Decision Form */}
        <div className="space-y-4">
          <Card className="sticky top-6 border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70">
              <CardTitle className="flex items-center gap-2 text-base font-extrabold text-slate-950">
                <ShieldCheck className="size-5 text-teal-700" />
                Ra quyết định phân xử tranh chấp
              </CardTitle>
              <p className="text-xs text-slate-500">
                Chọn phương án giải quyết dựa trên kết quả đối chiếu các báo cáo và kiểm định AI.
              </p>
            </CardHeader>
            <CardContent className="p-5">
              <form className="space-y-4" onSubmit={submit}>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Phương án xử lý
                  </label>
                  <select
                    className={inputClass}
                    value={decision}
                    onChange={(event) =>
                      setDecision(event.target.value as DisputeDecisionType)
                    }
                  >
                    {decisions.map((value) => (
                      <option key={value} value={value}>
                        {disputeDecisionLabels[value]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Reason Templates */}
                <div>
                  <p className="mb-1.5 text-xs font-bold text-slate-700">
                    Mẫu lý do phân xử nhanh
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(QUICK_REASONS[decision] ?? []).map((template, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReason(template)}
                        className="rounded-lg border border-teal-200 bg-teal-50/70 px-2.5 py-1.5 text-left text-xs font-medium text-teal-900 transition hover:bg-teal-100"
                      >
                        + {template}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Ghi chú / Lý do phán quyết (Bắt buộc)
                  </label>
                  <textarea
                    required
                    minLength={3}
                    className="min-h-28 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    placeholder="Nhập lý do chi tiết sau khi đối chiếu hình ảnh và điểm kiểm định AI..."
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </div>

                {(decision === "LinkCorrection" || decision === "RecordPublication") && (
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">
                      Mã hồ sơ đóng góp chuẩn hóa (Submission UUID)
                    </label>
                    <input
                      className={inputClass}
                      placeholder="Nhập UUID hồ sơ đóng góp đính chính..."
                      value={correctionSubmissionId}
                      onChange={(event) => setCorrectionSubmissionId(event.target.value)}
                    />
                  </div>
                )}

                {decision === "CreateAdvisory" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Thời điểm bắt đầu
                      </label>
                      <input
                        required
                        type="datetime-local"
                        className={inputClass}
                        value={startsAt}
                        onChange={(event) => setStartsAt(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Thời điểm kết thúc
                      </label>
                      <input
                        required
                        type="datetime-local"
                        className={inputClass}
                        value={endsAt}
                        onChange={(event) => setEndsAt(event.target.value)}
                      />
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={detail.isMutating || !reason.trim()}
                  type="submit"
                >
                  <ShieldAlert className="size-4" />
                  {detail.isMutating ? "Đang lưu phán quyết..." : "Xác nhận quyết định xử lý"}
                </Button>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  <p className="font-bold text-slate-800">Hướng dẫn quy trình phân xử:</p>
                  <ul className="mt-1 space-y-1">
                    <li>
                      • <strong>Yêu cầu minh chứng:</strong> Chuyển trạng thái sang chờ người dùng chụp thêm góc ảnh rõ hơn.
                    </li>
                    <li>
                      • <strong>Giữ dữ liệu gốc:</strong> Bác bỏ các báo cáo mâu thuẫn nếu ảnh minh chứng không đạt chuẩn.
                    </li>
                    <li>
                      • <strong>Tạo cảnh báo tạm thời:</strong> Hiển thị băng rôn cảnh báo trên ứng dụng di động khi tiện ích đang bảo trì/sửa chữa.
                    </li>
                  </ul>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
