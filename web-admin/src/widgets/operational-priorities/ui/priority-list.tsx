import Link from "next/link";
import { ArrowUpRight, Bot, FileCheck2, Gavel, ShieldAlert } from "lucide-react";
import type { PriorityItem, PriorityType, WorkflowSlice } from "@/entities/dashboard";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { EmptyState } from "@/shared/ui/empty-state";

const typeMeta: Record<PriorityType, { label: string; icon: typeof FileCheck2; className: string }> = {
  submission: { label: "Đóng góp", icon: FileCheck2, className: "bg-teal-50 text-teal-700" },
  dispute: { label: "Tranh chấp", icon: Gavel, className: "bg-amber-50 text-amber-700" },
  "ai-failure": { label: "AI thất bại", icon: Bot, className: "bg-red-50 text-red-700" },
  "suspicious-user": { label: "Tài khoản", icon: ShieldAlert, className: "bg-violet-50 text-violet-700" },
};

export function PriorityList({ items, workflow, isLoading }: { items?: PriorityItem[]; workflow?: WorkflowSlice[]; isLoading?: boolean }) {
  return (
    <Card className="h-full">
      <CardHeader className="border-b border-slate-100 p-4 pb-3">
        <div><CardTitle>Ưu tiên vận hành</CardTitle><CardDescription className="mt-2 flex flex-wrap gap-1.5">
          {workflow?.map((item, index) => <span key={item.name} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${index === 0 ? "bg-teal-50 text-teal-700" : index === 1 ? "bg-sky-50 text-sky-700" : "bg-red-50 text-red-700"}`}>{item.value} {item.name.toLowerCase()}</span>)}
        </CardDescription></div>
        <Badge variant={items && items.length > 0 ? "red" : "teal"} className="shrink-0">
          {items?.length ?? 0} cần xử lý
        </Badge>
      </CardHeader>
      <CardContent className="p-2">
        {isLoading || !items ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[76px]" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState title="Không có mục ưu tiên" description="Tất cả yêu cầu khẩn đã được xử lý." />
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const meta = typeMeta[item.type];
              const Icon = meta.icon;
              return (
                <div key={item.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-slate-50">
                  <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${meta.className}`}><Icon className="size-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5"><p className="truncate text-xs font-bold text-slate-900">{item.title}</p><Badge variant={item.priority === "high" ? "red" : "amber"} className="shrink-0 px-1.5 py-0 text-[9px]">{item.priority === "high" ? "Khẩn" : "Chú ý"}</Badge></div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{item.context}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-400">{item.waitingTime}</p>
                  </div>
                  <Link href={item.href} className={buttonVariants({ variant: "outline", size: "sm", className: "hidden px-2.5 sm:inline-flex" })}>{item.actionLabel}<ArrowUpRight className="size-3" /></Link>
                  <Link href={item.href} aria-label={item.actionLabel} className="grid size-8 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-teal-700 sm:hidden"><ArrowUpRight className="size-4" /></Link>
                </div>
              );
            })}
          </div>
        )}
        {!isLoading && items && items.length > 0 && <div className="border-t border-slate-100 px-2 pt-2"><Link href="/admin/canh-bao-su-co" className="text-[11px] font-semibold text-teal-700 hover:text-teal-800">Xem toàn bộ danh sách ưu tiên →</Link></div>}
      </CardContent>
    </Card>
  );
}
