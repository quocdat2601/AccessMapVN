import type { Metadata } from "next";
import { DisputeDetailPage } from "@/views/wf02-moderation";

export const metadata: Metadata = { title: "Chi tiet tranh chap tiep can" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DisputeDetailPage id={id} />;
}
