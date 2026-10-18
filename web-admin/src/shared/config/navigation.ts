import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  ChartNoAxesCombined,
  CircleGauge,
  FileCheck2,
  FileWarning,
  Gavel,
  MessageSquareWarning,
  Settings2,
  ShieldCheck,
  TicketPercent,
  UsersRound,
} from "lucide-react";

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  { label: "Tổng quan", items: [{ label: "Tổng quan", href: "/admin", icon: CircleGauge }] },
  {
    label: "Kiểm duyệt",
    items: [
      { label: "Hồ sơ đóng góp", href: "/admin/ho-so-dong-gop", icon: FileCheck2 },
      { label: "Tranh chấp tiếp cận", href: "/admin/tranh-chap-tiep-can", icon: Gavel },
      { label: "Báo cáo sai lệch", href: "/admin/bao-cao-sai-lech", icon: FileWarning },
      { label: "Bình luận cộng đồng", href: "/admin/binh-luan-cong-dong", icon: MessageSquareWarning },
    ],
  },
  {
    label: "Nền tảng",
    items: [
      { label: "Người dùng & Uy tín", href: "/admin/nguoi-dung-uy-tin", icon: UsersRound },
      { label: "Kho ưu đãi & Voucher", href: "/admin/kho-uu-dai-voucher", icon: TicketPercent },
      { label: "Báo cáo dữ liệu & Độ phủ", href: "/admin/bao-cao-du-lieu-do-phu", icon: ChartNoAxesCombined },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { label: "Cảnh báo & Sự cố", href: "/admin/canh-bao-su-co", icon: BellRing },
      { label: "Cài đặt hệ thống", href: "/admin/cai-dat-he-thong", icon: Settings2 },
    ],
  },
];

export const placeholderPageMeta = Object.fromEntries(
  navigationGroups.flatMap((group) =>
    group.items
      .filter((item) => item.href !== "/admin")
      .map((item) => [item.href.split("/").at(-1)!, { title: item.label, icon: item.icon }]),
  ),
) as Record<string, { title: string; icon: LucideIcon }>;

export const platformName = "AccessMapVN";
export const regionLabel = "TP.HCM & Hà Nội";
export const trustBadgeIcon = ShieldCheck;
