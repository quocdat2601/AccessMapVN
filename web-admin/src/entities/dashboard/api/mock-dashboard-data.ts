import type { DashboardData, PriorityItem } from "../model/types";

const priorities: PriorityItem[] = [
  {
    id: "submission-2048",
    type: "submission",
    title: "Hồ sơ Saigon Centre",
    context: "GPS ảnh minh chứng lệch 84 m so với vị trí địa điểm",
    waitingTime: "Chờ 3 giờ 20 phút",
    priority: "high",
    actionLabel: "Kiểm duyệt",
    href: "/admin/ho-so-dong-gop",
  },
  {
    id: "dispute-0712",
    type: "dispute",
    title: "Tranh chấp ram dốc · Saigon Centre",
    context: "Ba ý kiến cộng đồng mâu thuẫn về độ dốc lối vào",
    waitingTime: "Chờ 18 giờ",
    priority: "high",
    actionLabel: "Xử lý",
    href: "/admin/tranh-chap-tiep-can",
  },
  {
    id: "ai-job-9081",
    type: "ai-failure",
    title: "Tác vụ AI #9081 thất bại",
    context: "Không trích xuất được chiều rộng cửa từ ảnh minh chứng",
    waitingTime: "Chờ 47 phút",
    priority: "medium",
    actionLabel: "Kiểm tra",
    href: "/admin/canh-bao-su-co",
  },
  {
    id: "user-8492",
    type: "suspicious-user",
    title: "Tài khoản #8492 có hoạt động bất thường",
    context: "11 báo cáo trùng lặp tại 4 địa điểm trong 30 phút",
    waitingTime: "Phát hiện 1 giờ trước",
    priority: "medium",
    actionLabel: "Xem hồ sơ",
    href: "/admin/nguoi-dung-uy-tin",
  },
];

const common = {
  generatedAt: "09/10/2026 · 15:40",
  priorities,
  workflow: [
    { name: "Chờ phân công", value: 11, color: "#0f766e" },
    { name: "Đang xử lý", value: 8, color: "#2dd4bf" },
    { name: "Đã quá hạn", value: 5, color: "#f97316" },
  ],
  backlogAging: [
    { label: "Dưới 1 giờ", value: 10, percentage: 41.7, tone: "teal" as const },
    { label: "1–2 giờ", value: 6, percentage: 25, tone: "blue" as const },
    { label: "2–6 giờ", value: 3, percentage: 12.5, tone: "slate" as const },
    { label: "Trên 6 giờ", value: 5, percentage: 20.8, tone: "red" as const },
  ],
  aiOutcomes: [
    { label: "Tự động xác minh", value: 231, percentage: 82.5, color: "#0f766e" },
    { label: "Chuyển kiểm tra thủ công", value: 35, percentage: 12.5, color: "#f59e0b" },
    { label: "Xử lý thất bại", value: 14, percentage: 5, color: "#ef4444" },
  ],
  recentLocations: [
    { id: "loc-1", name: "Thư viện Khoa học Tổng hợp", district: "Quận 1, TP.HCM", accessibilityScore: 92, publishedAt: "14:35", category: "Thư viện" },
    { id: "loc-2", name: "Ga Metro Nhà hát Thành phố", district: "Quận 1, TP.HCM", accessibilityScore: 88, publishedAt: "13:10", category: "Giao thông" },
    { id: "loc-3", name: "Bảo tàng Phụ nữ Việt Nam", district: "Hoàn Kiếm, Hà Nội", accessibilityScore: 81, publishedAt: "11:45", category: "Văn hóa" },
  ],
};

export const mockDashboardData: Record<"7d" | "30d", DashboardData> = {
  "7d": {
    ...common,
    range: "7d",
    rangeLabel: "7 ngày qua",
    summary: {
      received: 186,
      resolved: 171,
      pendingSubmissions: 16,
      pendingDisputes: 8,
      locationsPublished: 74,
      coverageDistricts: 28,
      coverageDistrictsTotal: 30,
    },
    metrics: [
      { id: "pending", label: "Đang chờ xử lý", value: 24, supportingText: "16 hồ sơ · 8 tranh chấp", comparison: "Tăng 3 mục so với đầu kỳ", trend: 14.3, trendDirection: "up", tone: "warning", icon: "inbox" },
      { id: "overdue", label: "Vụ việc quá hạn", value: 5, supportingText: "21% tổng tồn đọng", comparison: "Giảm 2 mục so với kỳ trước", trend: 28.6, trendDirection: "down", tone: "critical", icon: "clock-alert" },
      { id: "processing-time", label: "Xử lý trung bình", value: 42, unit: "phút", supportingText: "Mục tiêu dưới 45 phút", comparison: "Nhanh hơn 6 phút", trend: 12.5, trendDirection: "down", tone: "normal", icon: "timer" },
      { id: "on-time", label: "Giải quyết đúng hạn", value: 92, unit: "%", supportingText: "157/171 vụ việc", comparison: "Tăng 4,2 điểm phần trăm", trend: 4.2, trendDirection: "up", tone: "positive", icon: "circle-check" },
    ],
    trends: [
      { label: "03/10", submissions: 13, disputes: 5, resolved: 16, backlog: 11 },
      { label: "04/10", submissions: 16, disputes: 6, resolved: 21, backlog: 12 },
      { label: "05/10", submissions: 19, disputes: 8, resolved: 24, backlog: 15 },
      { label: "06/10", submissions: 16, disputes: 8, resolved: 22, backlog: 17 },
      { label: "07/10", submissions: 23, disputes: 11, resolved: 30, backlog: 21 },
      { label: "08/10", submissions: 21, disputes: 10, resolved: 38, backlog: 14 },
      { label: "Hôm nay", submissions: 20, disputes: 10, resolved: 20, backlog: 24 },
    ],
  },
  "30d": {
    ...common,
    range: "30d",
    rangeLabel: "30 ngày qua",
    summary: {
      received: 810,
      resolved: 730,
      pendingSubmissions: 16,
      pendingDisputes: 8,
      locationsPublished: 286,
      coverageDistricts: 28,
      coverageDistrictsTotal: 30,
    },
    metrics: [
      { id: "pending", label: "Đang chờ xử lý", value: 24, supportingText: "16 hồ sơ · 8 tranh chấp", comparison: "Giảm 8 mục so với đầu kỳ", trend: 25, trendDirection: "down", tone: "warning", icon: "inbox" },
      { id: "overdue", label: "Vụ việc quá hạn", value: 5, supportingText: "21% tổng tồn đọng", comparison: "Giảm 4 mục so với kỳ trước", trend: 44.4, trendDirection: "down", tone: "critical", icon: "clock-alert" },
      { id: "processing-time", label: "Xử lý trung bình", value: 47, unit: "phút", supportingText: "Mục tiêu dưới 45 phút", comparison: "Chậm hơn 2 phút", trend: 4.4, trendDirection: "up", tone: "warning", icon: "timer" },
      { id: "on-time", label: "Giải quyết đúng hạn", value: 89, unit: "%", supportingText: "650/730 vụ việc", comparison: "Tăng 1,8 điểm phần trăm", trend: 1.8, trendDirection: "up", tone: "positive", icon: "circle-check" },
    ],
    trends: [
      { label: "10/09", submissions: 42, disputes: 16, resolved: 52, backlog: 30 },
      { label: "13/09", submissions: 49, disputes: 19, resolved: 63, backlog: 35 },
      { label: "16/09", submissions: 48, disputes: 18, resolved: 68, backlog: 33 },
      { label: "19/09", submissions: 55, disputes: 22, resolved: 71, backlog: 39 },
      { label: "22/09", submissions: 52, disputes: 21, resolved: 75, backlog: 37 },
      { label: "25/09", submissions: 58, disputes: 25, resolved: 82, backlog: 38 },
      { label: "28/09", submissions: 57, disputes: 23, resolved: 75, backlog: 43 },
      { label: "01/10", submissions: 63, disputes: 27, resolved: 89, backlog: 44 },
      { label: "04/10", submissions: 66, disputes: 28, resolved: 91, backlog: 47 },
      { label: "07/10", submissions: 65, disputes: 26, resolved: 44, backlog: 61 },
      { label: "Hôm nay", submissions: 20, disputes: 10, resolved: 20, backlog: 24 },
    ],
  },
};

if (process.env.NODE_ENV !== "production") {
  for (const dataset of Object.values(mockDashboardData)) {
    const pendingTotal = dataset.summary.pendingSubmissions + dataset.summary.pendingDisputes;
    const agingTotal = dataset.backlogAging.reduce((sum, item) => sum + item.value, 0);
    const receivedTotal = dataset.trends.reduce((sum, item) => sum + item.submissions + item.disputes, 0);
    const resolvedTotal = dataset.trends.reduce((sum, item) => sum + item.resolved, 0);
    if (pendingTotal !== 24 || agingTotal !== pendingTotal || receivedTotal !== dataset.summary.received || resolvedTotal !== dataset.summary.resolved) {
      throw new Error(`Dữ liệu mock không nhất quán cho kỳ ${dataset.range}`);
    }
  }
}
