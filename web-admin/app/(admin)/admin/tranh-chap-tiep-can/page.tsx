import type { Metadata } from "next";
import { ModerationQueuePage } from "@/views/community-moderation";

export const metadata: Metadata = { title: "Tranh chấp tiếp cận" };

export default function Page() {
  return <ModerationQueuePage kind="disputes" />;
}
