import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Eye, MapPin } from "lucide-react";
import type { ContributionRecord } from "@/entities/contribution";
import { contributionStatusMeta, contributionTypeLabels, formatWaitingTime, verificationOutcomeLabels } from "@/entities/contribution/lib/presentation";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";

const avatarTones = { teal: "bg-teal-700 text-white", cyan: "bg-cyan-100 text-cyan-800", slate: "bg-slate-200 text-slate-700", mint: "bg-teal-100 text-teal-800" };

function Confidence({ value, label }: { value: number; label: string }) {
  const tone = value >= 80 ? "bg-teal-600" : value >= 60 ? "bg-amber-500" : "bg-red-500";
  return <div className="min-w-28"><div className="flex items-center justify-between gap-2"><strong className={cn("text-xs", value < 60 ? "text-red-600" : "text-slate-800")}>{value}%</strong><span className="truncate text-[10px] text-slate-500">{label}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={cn("h-full rounded-full", tone)} style={{ width: `${value}%` }} /></div></div>;
}

export function ContributionTable({ items }: { items: ContributionRecord[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-4 py-3">Hồ sơ</th><th className="px-4 py-3">Địa điểm</th><th className="px-4 py-3">Người đóng góp</th><th className="px-4 py-3">Nội dung</th><th className="px-4 py-3">Xác minh AI</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const status = contributionStatusMeta[item.status];
              return (
                <tr key={item.id} className="group bg-white align-middle transition hover:bg-slate-50/70">
                  <td className="px-4 py-3"><div className="flex items-start gap-2">{item.priority === "high" && <span className="mt-1.5 size-2 rounded-full bg-red-500" title="Có cảnh báo" />}<div><Link href={`/admin/ho-so-dong-gop/${item.id}`} className="text-xs font-extrabold text-teal-800 hover:underline">{item.id}</Link><p className="mt-1 text-[10px] text-slate-400">{item.attemptLabel}</p>{item.waitingMinutes > 0 && <p className={cn("mt-0.5 text-[10px]", item.waitingMinutes > 120 ? "font-semibold text-red-600" : "text-slate-400")}>{formatWaitingTime(item.waitingMinutes)}</p>}</div></div></td>
                  <td className="max-w-[230px] px-4 py-3"><p className="truncate text-xs font-bold text-slate-900">{item.place.name}</p><Badge variant={item.type === "new_place" ? "blue" : "neutral"} className="mt-1">{contributionTypeLabels[item.type]}</Badge><p className="mt-1 truncate text-[10px] text-slate-400">{item.place.address}, {item.place.district}</p></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold", avatarTones[item.contributor.avatarTone])}>{item.contributor.initials}</span><div><p className="text-xs font-semibold text-slate-800">{item.contributor.name}</p><p className="mt-0.5 text-[10px] font-medium text-teal-700">Uy tín · {item.contributor.reputationScore} điểm</p></div></div></td>
                  <td className="max-w-[180px] px-4 py-3"><div className="flex flex-wrap gap-1">{item.categories.map((category) => <span key={category} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">{category}</span>)}</div></td>
                  <td className="px-4 py-3"><Confidence value={item.verification.confidence} label={verificationOutcomeLabels[item.verification.outcome]} />{item.priority === "high" && <p className="mt-1 flex items-center gap-1 text-[10px] text-red-600"><AlertTriangle className="size-3" />Cần kiểm tra thủ công</p>}</td>
                  <td className="px-4 py-3"><Badge variant={status.badge} className="gap-1.5"><span className={cn("size-1.5 rounded-full", item.status === "rejected" ? "bg-red-500" : item.status === "needs_supplement" ? "bg-amber-500" : "bg-teal-500")} />{status.label}</Badge></td>
                  <td className="px-4 py-3 text-right"><Link href={`/admin/ho-so-dong-gop/${item.id}`} className={buttonVariants({ variant: item.status === "pending" ? "default" : "outline", size: "sm" })}>{item.status === "pending" ? <ArrowUpRight className="size-3.5" /> : <Eye className="size-3.5" />}{status.action}</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 md:hidden">
        {items.map((item) => { const status = contributionStatusMeta[item.status]; return <article key={item.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Link href={`/admin/ho-so-dong-gop/${item.id}`} className="text-sm font-extrabold text-teal-800">{item.id}</Link>{item.priority === "high" && <AlertTriangle className="size-4 text-red-500" />}</div><p className="mt-1 text-xs text-slate-400">{item.attemptLabel} · {formatWaitingTime(item.waitingMinutes)}</p></div><Badge variant={status.badge}>{status.label}</Badge></div><div><p className="font-bold text-slate-900">{item.place.name}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="size-3" />{item.place.address}, {item.place.district}</p></div><div className="flex flex-wrap gap-1">{item.categories.map((category) => <span key={category} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-600">{category}</span>)}</div><div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3"><div className="text-xs text-slate-500"><strong className="text-slate-800">{item.contributor.name}</strong> · {item.contributor.reputationScore} điểm</div><Link href={`/admin/ho-so-dong-gop/${item.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>{status.action}<ArrowUpRight className="size-3" /></Link></div></article>; })}
      </div>
    </>
  );
}
