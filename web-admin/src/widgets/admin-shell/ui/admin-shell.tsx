"use client";

import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { Sidebar } from "./sidebar";
import { TopHeader } from "./top-header";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-h-screen bg-slate-50/80">
        <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCollapsedChange={() => setCollapsed((value) => !value)} onMobileClose={() => setMobileOpen(false)} />
        <div className={cn("min-h-screen transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-[260px]")}>
          <TopHeader onMenuOpen={() => setMobileOpen(true)} />
          <main>{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
