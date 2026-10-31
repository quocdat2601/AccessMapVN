import type { Metadata } from "next";
import { DisputeDetailPage } from "@/views/community-moderation";

export const metadata: Metadata = { title: "Chi tiết tranh chấp tiếp cận" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DisputeDetailPage id={id} />;
}
