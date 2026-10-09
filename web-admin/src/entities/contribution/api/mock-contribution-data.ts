import type { ContributionRecord } from "../model/types";

const place = (id: string, name: string, address: string, district: string, city: "TP.HCM" | "Hà Nội" = "TP.HCM") => ({ id, name, address, district, city });
const contributor = (id: string, name: string, initials: string, reputationScore: number, avatarTone: "teal" | "cyan" | "slate" | "mint") => ({ id, name, initials, reputationScore, avatarTone });

export const contributionMockRecords: ContributionRecord[] = [
  {
    id: "SUB-2026-1042", submittedAt: "2026-10-09T08:05:00+07:00", attemptLabel: "Lần gửi đầu", type: "place_update", reason: "information_update",
    place: place("place-saigon-centre", "Saigon Centre (Takashimaya)", "65 Lê Lợi, P. Bến Nghé", "Quận 1"),
    contributor: contributor("usr-mai-anh", "Mai Anh", "MA", 88, "mint"), categories: ["Ram dốc", "Cửa tự động"],
    verification: { confidence: 67, outcome: "needs_review", note: "Tọa độ ảnh lệch 84 m so với địa điểm" }, status: "pending", priority: "high", waitingMinutes: 215, evidenceCount: 4,
  },
  {
    id: "SUB-2026-1041", submittedAt: "2026-10-09T08:34:00+07:00", attemptLabel: "Lần gửi đầu", type: "new_place", reason: "new_accessibility_data",
    place: place("place-rex", "Khách sạn Rex Sài Gòn", "141 Nguyễn Huệ, P. Bến Nghé", "Quận 1"),
    contributor: contributor("usr-hoang-nam", "Hoàng Nam", "HN", 76, "cyan"), categories: ["Lối vào chính"],
    verification: { confidence: 92, outcome: "matched", note: "Ảnh và tọa độ khớp dữ liệu bản đồ" }, status: "pending", priority: "normal", waitingMinutes: 186, evidenceCount: 3,
  },
  {
    id: "SUB-2026-1040", submittedAt: "2026-10-09T08:55:00+07:00", attemptLabel: "Bổ sung lần 1", type: "place_update", reason: "evidence_correction",
    place: place("place-vincom-dong-khoi", "Vincom Center Đồng Khởi", "72 Lê Thánh Tôn, P. Bến Nghé", "Quận 1"),
    contributor: contributor("usr-thuy-duong", "Lê Thùy Dương", "LD", 64, "mint"), categories: ["Ram dốc"],
    verification: { confidence: 72, outcome: "missing_evidence", note: "Thiếu ảnh toàn cảnh lối vào" }, status: "needs_supplement", priority: "high", waitingMinutes: 171, evidenceCount: 2,
  },
  {
    id: "SUB-2026-1039", submittedAt: "2026-10-09T09:12:00+07:00", attemptLabel: "Bổ sung 1/2", type: "place_update", reason: "evidence_correction",
    place: place("place-cho-ray", "Bệnh viện Chợ Rẫy", "201B Nguyễn Chí Thanh, P.12", "Quận 5"),
    contributor: contributor("usr-van-binh", "Trần Văn Bình", "TB", 52, "slate"), categories: ["Ram dốc", "Thang máy", "WC tiếp cận"],
    verification: { confidence: 45, outcome: "needs_cross_check", note: "Hai ảnh có dữ liệu mâu thuẫn" }, status: "pending", priority: "high", waitingMinutes: 148, evidenceCount: 5,
  },
  {
    id: "SUB-2026-1038", submittedAt: "2026-10-09T09:45:00+07:00", attemptLabel: "Lần gửi đầu", type: "place_update", reason: "information_update",
    place: place("place-saigon-square", "Sài Gòn Square", "81 Nam Kỳ Khởi Nghĩa, P. Bến Thành", "Quận 1"),
    contributor: contributor("usr-nguyen-lan", "Nguyễn Lan", "NL", 75, "slate"), categories: ["Ram dốc"],
    verification: { confidence: 58, outcome: "missing_evidence", note: "Thiếu video đo độ dốc" }, status: "needs_supplement", priority: "normal", waitingMinutes: 116, evidenceCount: 2,
  },
  {
    id: "SUB-2026-1035", submittedAt: "2026-10-09T10:03:00+07:00", attemptLabel: "Lần gửi đầu", type: "new_place", reason: "new_accessibility_data",
    place: place("place-ben-thanh-metro", "Ga Bến Thành (Metro 1)", "Quảng trường Quách Thị Trang", "Quận 1"),
    contributor: contributor("usr-quoc-dat", "Vũ Quốc Đạt", "VĐ", 98, "teal"), categories: ["Thang máy", "Lối xúc giác", "WC tiếp cận"],
    verification: { confidence: 100, outcome: "publishable", checkedItems: 3, totalItems: 3, note: "Đủ bằng chứng để công bố" }, status: "published", priority: "normal", waitingMinutes: 0, evidenceCount: 8,
  },
  {
    id: "SUB-2026-1032", submittedAt: "2026-10-09T10:20:00+07:00", attemptLabel: "Lần gửi đầu", type: "place_update", reason: "information_update",
    place: place("place-city-theatre", "Nhà hát Thành phố", "07 Công trường Lam Sơn, P. Bến Nghé", "Quận 1"),
    contributor: contributor("usr-nguyen-lan", "Nguyễn Lan", "NL", 75, "slate"), categories: ["Ram dốc"],
    verification: { confidence: 31, outcome: "not_publishable", note: "Ảnh không thể hiện đúng khu vực khai báo" }, status: "rejected", priority: "normal", waitingMinutes: 0, evidenceCount: 1,
  },
  {
    id: "SUB-2026-1030", submittedAt: "2026-10-09T10:38:00+07:00", attemptLabel: "Lần gửi đầu", type: "place_update", reason: "new_accessibility_data",
    place: place("place-diamond-plaza", "Diamond Plaza", "34 Lê Duẩn, P. Bến Nghé", "Quận 1"),
    contributor: contributor("usr-pham-hung", "Phạm Hùng", "PH", 82, "mint"), categories: ["Bãi đỗ xe ưu tiên", "Lối vào phẳng"],
    verification: { confidence: 100, outcome: "publishable", checkedItems: 2, totalItems: 2, note: "Đủ bằng chứng để công bố" }, status: "published", priority: "normal", waitingMinutes: 0, evidenceCount: 6,
  },
  {
    id: "SUB-2026-1029", submittedAt: "2026-10-09T10:55:00+07:00", attemptLabel: "Lần gửi đầu", type: "new_place", reason: "new_accessibility_data",
    place: place("place-central-post", "Bưu điện Trung tâm Sài Gòn", "02 Công xã Paris, P. Bến Nghé", "Quận 1"),
    contributor: contributor("usr-gia-han", "Lê Gia Hân", "GH", 70, "cyan"), categories: ["Lối vào chính", "Ram dốc"],
    verification: { confidence: 62, outcome: "needs_review", note: "Cần xác nhận lối vào phía Đông" }, status: "pending", priority: "high", waitingMinutes: 133, evidenceCount: 3,
  },
  {
    id: "SUB-2026-1028", submittedAt: "2026-10-09T11:08:00+07:00", attemptLabel: "Lần gửi đầu", type: "place_update", reason: "information_update",
    place: place("place-hcm-museum", "Bảo tàng TP.HCM", "65 Lý Tự Trọng, P. Bến Nghé", "Quận 1"),
    contributor: contributor("usr-minh-khoi", "Ngô Minh Khôi", "MK", 84, "teal"), categories: ["Thang máy"],
    verification: { confidence: 89, outcome: "matched", note: "Thông tin phù hợp với bằng chứng" }, status: "pending", priority: "normal", waitingMinutes: 104, evidenceCount: 4,
  },
  {
    id: "SUB-2026-1027", submittedAt: "2026-10-09T11:26:00+07:00", attemptLabel: "Bổ sung lần 2", type: "place_update", reason: "evidence_correction",
    place: place("place-tan-dinh-market", "Chợ Tân Định", "336 Hai Bà Trưng, P. Tân Định", "Quận 1"),
    contributor: contributor("usr-thanh-tam", "Đỗ Thanh Tâm", "TT", 59, "slate"), categories: ["Lối vào chính", "WC tiếp cận"],
    verification: { confidence: 49, outcome: "needs_cross_check", note: "Vị trí WC chưa khớp sơ đồ" }, status: "pending", priority: "high", waitingMinutes: 97, evidenceCount: 3,
  },
  {
    id: "SUB-2026-1026", submittedAt: "2026-10-09T11:42:00+07:00", attemptLabel: "Lần gửi đầu", type: "new_place", reason: "new_accessibility_data",
    place: place("place-hanoi-library", "Thư viện Hà Nội", "47 Bà Triệu, P. Hàng Bài", "Hoàn Kiếm", "Hà Nội"),
    contributor: contributor("usr-thu-ha", "Nguyễn Thu Hà", "TH", 91, "mint"), categories: ["Ram dốc", "Thang máy"],
    verification: { confidence: 94, outcome: "matched", note: "Ảnh, GPS và mô tả đều khớp" }, status: "pending", priority: "normal", waitingMinutes: 82, evidenceCount: 5,
  },
  {
    id: "SUB-2026-1025", submittedAt: "2026-10-09T11:58:00+07:00", attemptLabel: "Lần gửi đầu", type: "place_update", reason: "information_update",
    place: place("place-union-square", "Union Square", "171 Đồng Khởi, P. Bến Nghé", "Quận 1"),
    contributor: contributor("usr-thuy-duong", "Lê Thùy Dương", "LD", 64, "mint"), categories: ["Cửa tự động"],
    verification: { confidence: 78, outcome: "needs_review", note: "Cần kiểm tra thời điểm chụp ảnh" }, status: "pending", priority: "normal", waitingMinutes: 68, evidenceCount: 2,
  },
  {
    id: "SUB-2026-1024", submittedAt: "2026-10-09T12:14:00+07:00", attemptLabel: "Lần gửi đầu", type: "new_place", reason: "new_accessibility_data",
    place: place("place-youth-cultural", "Nhà Văn hóa Thanh niên", "04 Phạm Ngọc Thạch, P. Bến Nghé", "Quận 1"),
    contributor: contributor("usr-quoc-dat", "Vũ Quốc Đạt", "VĐ", 98, "teal"), categories: ["Ram dốc", "Lối vào phẳng"],
    verification: { confidence: 96, outcome: "matched", note: "Dữ liệu có độ tin cậy cao" }, status: "pending", priority: "normal", waitingMinutes: 54, evidenceCount: 6,
  },
  {
    id: "SUB-2026-1023", submittedAt: "2026-10-09T12:31:00+07:00", attemptLabel: "Lần gửi đầu", type: "place_update", reason: "information_update",
    place: place("place-opera-mall", "Parkson Saigon Tourist", "35bis Lê Thánh Tôn, P. Bến Nghé", "Quận 1"),
    contributor: contributor("usr-mai-anh", "Mai Anh", "MA", 88, "mint"), categories: ["Thang máy", "WC tiếp cận"],
    verification: { confidence: 85, outcome: "matched", note: "Nội dung phù hợp hồ sơ địa điểm" }, status: "pending", priority: "normal", waitingMinutes: 43, evidenceCount: 4,
  },
  {
    id: "SUB-2026-1022", submittedAt: "2026-10-09T12:47:00+07:00", attemptLabel: "Lần gửi đầu", type: "place_update", reason: "new_accessibility_data",
    place: place("place-book-street", "Đường sách Nguyễn Văn Bình", "Nguyễn Văn Bình, P. Bến Nghé", "Quận 1"),
    contributor: contributor("usr-hoang-nam", "Hoàng Nam", "HN", 76, "cyan"), categories: ["Lối vào phẳng"],
    verification: { confidence: 90, outcome: "matched", note: "Bằng chứng hợp lệ" }, status: "pending", priority: "normal", waitingMinutes: 35, evidenceCount: 3,
  },
  {
    id: "SUB-2026-1021", submittedAt: "2026-10-09T13:02:00+07:00", attemptLabel: "Bổ sung lần 1", type: "place_update", reason: "evidence_correction",
    place: place("place-hung-vuong", "Bệnh viện Hùng Vương", "128 Hồng Bàng, P.12", "Quận 5"),
    contributor: contributor("usr-van-binh", "Trần Văn Bình", "TB", 52, "slate"), categories: ["WC tiếp cận"],
    verification: { confidence: 51, outcome: "missing_evidence", note: "Thiếu ảnh tay vịn và khoảng quay xe lăn" }, status: "needs_supplement", priority: "high", waitingMinutes: 152, evidenceCount: 2,
  },
  {
    id: "SUB-2026-1020", submittedAt: "2026-10-09T13:18:00+07:00", attemptLabel: "Lần gửi đầu", type: "new_place", reason: "evidence_correction",
    place: place("place-west-lake", "Không gian văn hóa Tây Hồ", "Ngõ 612 Lạc Long Quân", "Tây Hồ", "Hà Nội"),
    contributor: contributor("usr-gia-han", "Lê Gia Hân", "GH", 70, "cyan"), categories: ["Ram dốc"],
    verification: { confidence: 43, outcome: "missing_evidence", note: "Ảnh không đủ sáng để xác minh" }, status: "needs_supplement", priority: "high", waitingMinutes: 129, evidenceCount: 1,
  },
  {
    id: "SUB-2026-1019", submittedAt: "2026-10-09T13:37:00+07:00", attemptLabel: "Lần gửi đầu", type: "place_update", reason: "evidence_correction",
    place: place("place-gia-dinh", "Công viên Gia Định", "Hoàng Minh Giám, P.3", "Gò Vấp"),
    contributor: contributor("usr-thanh-tam", "Đỗ Thanh Tâm", "TT", 59, "slate"), categories: ["Lối vào chính"],
    verification: { confidence: 64, outcome: "missing_evidence", note: "Cần bổ sung ảnh biển chỉ dẫn" }, status: "needs_supplement", priority: "normal", waitingMinutes: 71, evidenceCount: 2,
  },
  {
    id: "SUB-2026-1018", submittedAt: "2026-10-09T13:55:00+07:00", attemptLabel: "Lần gửi đầu", type: "new_place", reason: "new_accessibility_data",
    place: place("place-women-museum", "Bảo tàng Phụ nữ Việt Nam", "36 Lý Thường Kiệt, P. Hàng Bài", "Hoàn Kiếm", "Hà Nội"),
    contributor: contributor("usr-thu-ha", "Nguyễn Thu Hà", "TH", 91, "mint"), categories: ["Ram dốc", "Thang máy", "WC tiếp cận"],
    verification: { confidence: 100, outcome: "publishable", checkedItems: 3, totalItems: 3, note: "Đủ bằng chứng để công bố" }, status: "published", priority: "normal", waitingMinutes: 0, evidenceCount: 7,
  },
  {
    id: "SUB-2026-1017", submittedAt: "2026-10-09T14:16:00+07:00", attemptLabel: "Lần gửi đầu", type: "place_update", reason: "information_update",
    place: place("place-science-library", "Thư viện Khoa học Tổng hợp", "69 Lý Tự Trọng, P. Bến Thành", "Quận 1"),
    contributor: contributor("usr-minh-khoi", "Ngô Minh Khôi", "MK", 84, "teal"), categories: ["Lối xúc giác", "Thang máy"],
    verification: { confidence: 100, outcome: "publishable", checkedItems: 2, totalItems: 2, note: "Đủ bằng chứng để công bố" }, status: "published", priority: "normal", waitingMinutes: 0, evidenceCount: 5,
  },
];
