import { redirect } from "next/navigation";

export default async function LegacySectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  redirect(`/admin/${section}`);
}
