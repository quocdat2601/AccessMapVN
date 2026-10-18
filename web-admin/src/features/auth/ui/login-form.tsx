"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { createBrowserSupabaseClient } from "@/shared/lib/supabase/client";
import { Button } from "@/shared/ui/button";

function safeNextPath(value?: string) {
  return value?.startsWith("/admin") ? value : "/admin";
}

export function LoginForm({
  nextPath,
  configurationMissing = false,
}: {
  nextPath?: string;
  configurationMissing?: boolean;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    configurationMissing
      ? "Supabase Auth chưa được cấu hình. Hãy bổ sung các biến môi trường theo .env.example."
      : null,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      router.replace(safeNextPath(nextPath));
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể đăng nhập. Vui lòng kiểm tra lại tài khoản.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          Email quản trị
        </span>
        <span className="relative block">
          <UserRound className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
          <input
            required
            name="email"
            type="email"
            autoComplete="username"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:ring-3 focus:ring-teal-100"
            placeholder="admin@accessmap.vn"
          />
        </span>
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          Mật khẩu
        </span>
        <span className="relative block">
          <LockKeyhole className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
          <input
            required
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:ring-3 focus:ring-teal-100"
            placeholder="Nhập mật khẩu"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          >
            {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </span>
      </label>

      <div className="flex justify-end">
        <a
          href="mailto:hotro@accessmap.vn?subject=Khôi%20phục%20mật%20khẩu%20quản%20trị"
          className="text-xs font-semibold text-teal-700 transition hover:text-teal-900 hover:underline hover:underline-offset-4"
        >
          Quên mật khẩu?
        </a>
      </div>

      <Button
        type="submit"
        className="h-12 w-full rounded-xl text-sm font-bold shadow-sm"
        disabled={isSubmitting || configurationMissing}
      >
        {isSubmitting ? "Đang xác thực..." : "Đăng nhập"}
        <ArrowRight className="size-4" />
      </Button>

      <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        Phiên đăng nhập được bảo vệ bởi Supabase Auth
        <span className="h-px flex-1 bg-slate-200" />
      </div>
    </form>
  );
}
