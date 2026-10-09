import Image from "next/image";
import { DemoLoginForm } from "@/features/demo-login/ui/demo-login-form";
import { Brand } from "@/shared/ui/brand";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.03fr_.97fr]">
      <section className="relative hidden min-h-screen overflow-hidden border-r border-teal-100/60 bg-[#f5fbfb] lg:flex lg:flex-col">
        <Image
          src="/auth/accessmap-login-map.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 52vw, 0px"
          className="object-cover object-center"
          aria-hidden="true"
        />

        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.97)_0%,rgba(255,255,255,.88)_24%,rgba(247,253,252,.45)_49%,rgba(240,253,250,.04)_70%)]" />
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white/75 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white/15 to-transparent" />

        <div className="relative z-10 flex h-full min-h-screen flex-col px-10 py-9 xl:px-14 xl:py-12 2xl:px-16">
          <Brand />
          <div className="mt-[clamp(3.25rem,8vh,5.5rem)] max-w-[34rem]">
            <h1 className="text-[clamp(2.5rem,3.45vw,4rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-slate-950">
              Vì một Việt Nam
              <br />
              <span className="text-teal-700">dễ tiếp cận hơn</span>
            </h1>
            <p className="mt-5 max-w-[28rem] text-base leading-7 text-slate-600 xl:text-lg xl:leading-8">
              Cùng xây dựng bản đồ địa điểm, dịch vụ và môi trường sống
              thân thiện, hòa nhập cho tất cả mọi người.
            </p>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-5 pb-8 pt-24 sm:px-10 sm:pb-10 sm:pt-28 lg:px-8 lg:py-10 xl:px-12">
        <div className="pointer-events-none absolute -right-28 -top-32 size-80 rounded-full bg-teal-50/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-36 -left-28 size-72 rounded-full bg-sky-50/70 blur-3xl" />
        <Brand className="absolute left-5 top-6 z-10 sm:left-10 sm:top-8 lg:hidden" />

        <div className="relative w-full max-w-[560px] rounded-[1.5rem] border border-slate-200/90 bg-white p-7 shadow-[0_24px_80px_rgba(15,118,110,.09)] sm:p-10 xl:p-12">
          <h2 className="text-[1.75rem] font-extrabold leading-tight tracking-[-0.025em] text-slate-950 sm:text-[2rem]">
            Đăng nhập quản trị
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
            Truy cập hệ thống quản trị AccessMapVN
          </p>
          <DemoLoginForm />
        </div>
      </section>
    </main>
  );
}
