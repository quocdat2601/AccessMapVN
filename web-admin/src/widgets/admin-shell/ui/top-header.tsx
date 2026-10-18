"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, Search, Settings, UserRound, X } from "lucide-react";
import * as Avatar from "@radix-ui/react-avatar";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useAdminIdentity } from "@/features/auth/model/use-admin-identity";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";

const menuItemClass = "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100";

export function TopHeader({ onMenuOpen }: { onMenuOpen: () => void }) {
  const router = useRouter();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { identity, signOut } = useAdminIdentity();

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-[73px] items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuOpen} aria-label="Mở thanh điều hướng"><Menu className="size-5" /></Button>

      <div className="relative ml-auto hidden w-full max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          aria-label="Tìm kiếm toàn cục"
          placeholder="Tìm địa điểm, người đóng góp, mã hồ sơ..."
          className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">⌘ K</kbd>
      </div>

      <Button variant="ghost" size="icon" className="ml-auto md:hidden" aria-label="Mở tìm kiếm" onClick={() => setMobileSearchOpen(true)}><Search className="size-5" /></Button>

      {mobileSearchOpen && (
        <div className="absolute inset-0 z-10 flex items-center gap-2 bg-white px-4 md:hidden">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input autoFocus type="search" aria-label="Tìm kiếm toàn cục" placeholder="Tìm địa điểm, mã hồ sơ..." className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100" /></div>
          <Button variant="ghost" size="icon" aria-label="Đóng tìm kiếm" onClick={() => setMobileSearchOpen(false)}><X className="size-5" /></Button>
        </div>
      )}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="outline" size="icon" className="relative" aria-label="Thông báo">
            <Bell className="size-[18px]" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500 ring-2 ring-white" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-[320px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <div className="flex items-center justify-between px-2 py-2">
              <p className="font-bold text-slate-900">Thông báo</p><span className="text-xs font-semibold text-teal-700">3 chưa đọc</span>
            </div>
            {[
              ["AI xử lý thất bại", "Tác vụ #9081 cần kiểm tra thủ công", "2 phút"],
              ["Sắp quá hạn SLA", "Tranh chấp #0712 còn 35 phút", "18 phút"],
              ["Độ phủ được cập nhật", "Quận Tây Hồ đạt 86% dữ liệu", "1 giờ"],
            ].map(([title, text, time]) => (
              <DropdownMenu.Item key={title} asChild>
                <Link href="/admin/canh-bao-su-co" className={cn(menuItemClass, "items-start border-t border-slate-100 py-3")}>
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-teal-600" />
                  <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-900">{title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{text}</span></span>
                  <span className="text-[10px] text-slate-400">{time}</span>
                </Link>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 rounded-lg p-1 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-600" aria-label="Mở menu quản trị viên">
            <Avatar.Root className="grid size-9 place-items-center overflow-hidden rounded-full bg-teal-700 text-xs font-bold text-white"><Avatar.Fallback>{identity.initials}</Avatar.Fallback></Avatar.Root>
            <div className="hidden text-left xl:block"><p className="max-w-36 truncate text-xs font-semibold text-slate-900">{identity.displayName}</p><p className="text-[10px] text-slate-500">{identity.role}</p></div>
            <ChevronDown className="hidden size-3.5 text-slate-400 xl:block" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            <DropdownMenu.Label className="px-2 py-2"><span className="block text-xs font-semibold text-slate-700">{identity.displayName}</span><span className="mt-0.5 block truncate text-[10px] font-normal text-slate-400">{identity.email}</span></DropdownMenu.Label>
            <DropdownMenu.Item asChild><Link href="/admin/nguoi-dung-uy-tin" className={menuItemClass}><UserRound className="size-4" />Hồ sơ của tôi</Link></DropdownMenu.Item>
            <DropdownMenu.Item asChild><Link href="/admin/cai-dat-he-thong" className={menuItemClass}><Settings className="size-4" />Thiết lập cá nhân</Link></DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
            <DropdownMenu.Item asChild><button type="button" disabled={isSigningOut} onClick={() => void handleSignOut()} className={cn(menuItemClass, "w-full disabled:opacity-50")}><LogOut className="size-4" />{isSigningOut ? "Đang đăng xuất..." : "Đăng xuất"}</button></DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}
