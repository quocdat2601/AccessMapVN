import type { Metadata } from "next";
import { ContributionDetailPage } from "@/views/contributions";

export const metadata: Metadata = { title: "Chi tiết hồ sơ đóng góp" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContributionDetailPage id={id} />;
}
