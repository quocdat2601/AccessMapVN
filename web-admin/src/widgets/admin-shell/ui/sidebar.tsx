"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Brand } from "@/shared/ui/brand";
import { navigationGroups } from "@/shared/config/navigation";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapsedChange: () => void;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onCollapsedChange, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const renderContent = (isCollapsed: boolean) => (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-[73px] items-center border-b border-slate-200 px-5", isCollapsed && "justify-center px-2")}>
        <Brand compact={isCollapsed} />
        <Button variant="ghost" size="icon" className="ml-auto lg:hidden" aria-label="Đóng thanh điều hướng" onClick={onMobileClose}>
          <X className="size-5" />
        </Button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3" aria-label="Điều hướng quản trị">
        {navigationGroups.map((group) => (
          <div key={group.label}>
            {!isCollapsed && <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{group.label}</p>}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950",
                      active && "bg-teal-50 font-semibold text-teal-800 hover:bg-teal-50 hover:text-teal-800",
                      isCollapsed && "justify-center px-0",
                    )}
                  >
                    <Icon className={cn("size-[18px] shrink-0", active ? "text-teal-700" : "text-slate-400 group-hover:text-slate-600")} strokeWidth={1.9} />
                    {!isCollapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                    {!isCollapsed && item.badge && <span className={cn("min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold", item.href.includes("canh-bao") || item.href.includes("tranh-chap") ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700", active && "bg-teal-100 text-teal-700")}>{item.badge}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={onCollapsedChange}
        className="absolute -right-3.5 top-1/2 hidden size-7 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 lg:grid"
        aria-label={isCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
        title={isCollapsed ? "Mở rộng" : "Thu gọn"}
      >
        {isCollapsed ? <ChevronRight className="size-4" strokeWidth={2.25} /> : <ChevronLeft className="size-4" strokeWidth={2.25} />}
      </button>
    </div>
  );

  return (
    <>
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white transition-[width] duration-200 lg:block", collapsed ? "w-[76px]" : "w-[260px]")}>{renderContent(collapsed)}</aside>
      {mobileOpen && <button aria-label="Đóng lớp phủ điều hướng" className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[1px] lg:hidden" onClick={onMobileClose} />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-[280px] border-r border-slate-200 bg-white transition-transform duration-200 lg:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}>{renderContent(false)}</aside>
    </>
  );
}
