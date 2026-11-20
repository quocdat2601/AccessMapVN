import type {
  AccessibilityFeatureType,
  CommunityCommentStatus,
  DisputeDecisionType,
  DisputeStatus,
  PublishedFeatureStatus,
  ReportReason,
  ReportStatus,
} from "../model/types";

export const featureLabels: Record<AccessibilityFeatureType, string> = {
  Ramp: "Ram dốc",
  EntranceDoor: "Cửa ra vào",
  Elevator: "Thang máy",
  AccessibleRestroom: "WC tiếp cận",
  TactilePaving: "Lối dẫn xúc giác",
};

export const publishedStatusLabels: Record<PublishedFeatureStatus, string> = {
  Available: "Có thể sử dụng",
  Limited: "Sử dụng hạn chế",
  NotAvailable: "Không có / không sử dụng được",
  Unknown: "Chưa xác định",
};

export const disputeStatusLabels: Record<DisputeStatus, string> = {
  Open: "Mới mở",
  UnderReview: "Đang xem xét",
  AwaitingMoreInfo: "Chờ minh chứng",
  CorrectionPending: "Chờ bản sửa",
  ResolvedBaseline: "Giữ dữ liệu gốc",
  ResolvedUpdated: "Đã cập nhật",
};

export const disputeDecisionLabels: Record<DisputeDecisionType, string> = {
  RequestEvidence: "Yêu cầu minh chứng",
  RetainBaseline: "Giữ dữ liệu gốc",
  LinkCorrection: "Liên kết hồ sơ sửa",
  RecordPublication: "Ghi nhận bản đã công bố",
  CreateAdvisory: "Tạo cảnh báo tạm thời",
};

export const reportStatusLabels: Record<ReportStatus, string> = {
  Submitted: "Mới gửi",
  UnderReview: "Đang xem xét",
  AwaitingMoreInfo: "Chờ bổ sung",
  LinkedToDispute: "Đã liên kết tranh chấp",
  Resolved: "Đã xử lý",
  Rejected: "Đã từ chối",
};

export const reportReasonLabels: Record<ReportReason, string> = {
  IncorrectFeature: "Thông tin tiện ích sai",
  MissingFeature: "Thiếu tiện ích",
  OutdatedInformation: "Thông tin đã cũ",
  Other: "Vấn đề khác",
  WrongAddressOrPin: "Sai địa chỉ hoặc ghim bản đồ",
};

export const commentStatusLabels: Record<CommunityCommentStatus, string> = {
  PendingReview: "Chờ duyệt",
  Approved: "Đã công khai",
  Hidden: "Đã ẩn",
  Rejected: "Đã từ chối",
};

export function formatAdminDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

export function formatEtagFromVersion(version?: number) {
  return version === undefined ? undefined : `\"${version}\"`;
}
