import type { Metadata } from "next";
import { CommentModerationPage } from "@/views/wf02-moderation";

export const metadata: Metadata = { title: "Kiem duyet binh luan cong dong" };

export default function Page() {
  return <CommentModerationPage />;
}
