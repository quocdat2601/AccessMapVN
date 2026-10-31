import type { Metadata } from "next";
import { ReportDetailPage } from "@/views/community-moderation";

export const metadata: Metadata = { title: "Chi tiết báo cáo sai lệch" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportDetailPage id={id} />;
}
