"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/shared/lib/supabase/client";

export interface AdminIdentity {
  email: string;
  displayName: string;
  initials: string;
  role: string;
}

function toIdentity(user: User | null): AdminIdentity {
  const email = user?.email ?? "Tài khoản quản trị";
  const displayName =
    String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "").trim() ||
    email.split("@")[0];
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("vi"))
    .join("") || "AD";
  const role = String(user?.app_metadata?.role ?? "Quản trị viên");
  return { email, displayName, initials, role };
}

export function useAdminIdentity() {
  const [identity, setIdentity] = useState<AdminIdentity>(() => toIdentity(null));
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setIdentity(toIdentity(data.user));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIdentity(toIdentity(session?.user ?? null));
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [supabase]);

  return { identity, signOut };
}
