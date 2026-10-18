import type { Metadata } from "next";
import { ModerationQueuePage } from "@/views/wf02-moderation";

export const metadata: Metadata = { title: "Tranh chấp tiếp cận" };

export default function Page() {
  return <ModerationQueuePage kind="disputes" />;
}
