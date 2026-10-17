import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/shared/config/runtime";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { AdminShell } from "@/widgets/admin-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) redirect("/login?reason=configuration");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/login");

  return <AdminShell>{children}</AdminShell>;
}
