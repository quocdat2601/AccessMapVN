import { Bot, CheckCircle2, Clock3, History, Send, ShieldCheck, XCircle } from "lucide-react";
import type { ContributionTimelineEvent } from "@/entities/contribution";
import { formatDateTime } from "@/entities/contribution/lib/presentation";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";

const iconMap = { submitted: Send, ai_completed: Bot, review_started: ShieldCheck, info_requested: Clock3, reminder_sent: Send, published: CheckCircle2, rejected: XCircle };

export function TimelineCard({ events }: { events: ContributionTimelineEvent[] }) {
  return <Card className="p-4"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-950"><History className="size-4 text-slate-400" />Tiến trình thẩm định</h2><div className="mt-4 space-y-0">{events.map((event, index) => { const Icon = iconMap[event.type]; const critical = event.type === "rejected"; const warning = event.type === "info_requested" || event.type === "reminder_sent"; return <div key={event.id} className="relative flex gap-3 pb-5 last:pb-0">{index < events.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-18px)] w-px bg-slate-200" />}<span className={cn("relative z-10 grid size-7 shrink-0 place-items-center rounded-full ring-4 ring-white", critical ? "bg-red-100 text-red-700" : warning ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700")}><Icon className="size-3.5" /></span><div className="min-w-0"><p className={cn("text-xs font-bold", critical ? "text-red-700" : warning ? "text-amber-800" : "text-slate-800")}>{event.title}</p><p className="mt-0.5 text-[10px] text-slate-400">{formatDateTime(event.occurredAt)} · {event.actor}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{event.description}</p></div></div>; })}</div></Card>;
}
