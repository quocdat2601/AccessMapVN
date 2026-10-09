import type { Metadata } from "next";
import { ContributionListPage } from "@/views/contributions";

export const metadata: Metadata = { title: "Hồ sơ đóng góp" };

export default function Page() {
  return <ContributionListPage />;
}
