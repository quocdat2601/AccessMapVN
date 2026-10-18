import type { Metadata } from "next";
import { ReportDetailPage } from "@/views/wf02-moderation";

export const metadata: Metadata = { title: "Chi tiet bao cao sai lech" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportDetailPage id={id} />;
}
