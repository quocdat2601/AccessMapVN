import type { Metadata } from "next";
import { CommentModerationPage } from "@/views/community-moderation";

export const metadata: Metadata = { title: "Kiểm duyệt bình luận cộng đồng" };

export default function Page() {
  return <CommentModerationPage />;
}
