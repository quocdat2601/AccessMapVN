import type { ContributionReason, ContributionStatus, ContributionType, VerificationOutcome } from "../model/types";

export const contributionStatusMeta: Record<ContributionStatus, { label: string; badge: "teal" | "amber" | "red" | "blue"; action: string }> = {
  pending: { label: "Chờ kiểm duyệt", badge: "blue", action: "Kiểm duyệt" },
  needs_supplement: { label: "Chờ bổ sung", badge: "amber", action: "Xem yêu cầu" },
  published: { label: "Đã công bố", badge: "teal", action: "Xem chi tiết" },
  rejected: { label: "Đã từ chối", badge: "red", action: "Xem chi tiết" },
};

export const contributionTypeLabels: Record<ContributionType, string> = {
  new_place: "Địa điểm mới",
  place_update: "Cập nhật địa điểm",
};

export const contributionReasonLabels: Record<ContributionReason, string> = {
  new_accessibility_data: "Dữ liệu tiếp cận mới",
  information_update: "Cập nhật thông tin",
  evidence_correction: "Hiệu chỉnh minh chứng",
};

export const verificationOutcomeLabels: Record<VerificationOutcome, string> = {
  needs_review: "Cần kiểm duyệt",
  matched: "Khớp dữ liệu",
  missing_evidence: "Thiếu minh chứng",
  needs_cross_check: "Cần đối chiếu",
  publishable: "Có thể công bố",
  not_publishable: "Không đủ điều kiện",
};

export const accessibilityCategories = ["Lối vào chính", "Ram dốc", "Cửa tự động", "Thang máy", "WC tiếp cận", "Lối xúc giác", "Bãi đỗ xe ưu tiên", "Lối vào phẳng"] as const;

export function formatWaitingTime(minutes: number) {
  if (minutes <= 0) return "Đã hoàn tất";
  if (minutes < 60) return `Chờ ${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `Chờ ${hours} giờ${rest ? ` ${rest} phút` : ""}`;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
}
