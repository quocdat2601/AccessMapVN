import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Tổng quan vận hành | AccessMapVN", template: "%s | AccessMapVN" },
  description: "Cổng quản trị vận hành nền tảng dữ liệu tiếp cận AccessMapVN.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
