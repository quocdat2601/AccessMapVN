import type { Metadata } from "next";
import { ModerationQueuePage } from "@/views/wf02-moderation";

export const metadata: Metadata = { title: "Báo cáo thông tin sai lệch" };

export default function Page() {
  return <ModerationQueuePage kind="reports" />;
}
