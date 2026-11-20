import type { Metadata } from "next";
import { ModerationQueuePage } from "@/views/community-moderation";

export const metadata: Metadata = { title: "Báo cáo thông tin sai lệch" };

export default function Page() {
  return <ModerationQueuePage kind="reports" />;
}
