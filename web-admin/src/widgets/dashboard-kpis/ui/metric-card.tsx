import { ArrowDownRight, ArrowUpRight, CircleCheckBig, ClockAlert, Inbox, Minus, Timer } from "lucide-react";
import type { DashboardMetric } from "@/entities/dashboard";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";

const icons = { inbox: Inbox, "clock-alert": ClockAlert, timer: Timer, "circle-check": CircleCheckBig };

const toneStyles = {
  normal: { icon: "bg-sky-50 text-sky-700", value: "text-slate-950", border: "border-t-sky-500" },
  warning: { icon: "bg-amber-50 text-amber-700", value: "text-slate-950", border: "border-t-amber-500" },
  critical: { icon: "bg-red-50 text-red-700", value: "text-red-700", border: "border-t-red-500" },
  positive: { icon: "bg-teal-50 text-teal-700", value: "text-teal-700", border: "border-t-teal-600" },
};

function isFavorable(metric: DashboardMetric) {
  if (metric.trendDirection === "flat") return null;
  return metric.id === "on-time" ? metric.trendDirection === "up" : metric.trendDirection === "down";
}

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = icons[metric.icon];
  const favorable = isFavorable(metric);
  const TrendIcon = metric.trendDirection === "up" ? ArrowUpRight : metric.trendDirection === "down" ? ArrowDownRight : Minus;
  const styles = toneStyles[metric.tone];

  return (
    <Card className={cn("border-t-2 p-3.5 transition hover:-translate-y-0.5 hover:shadow-md", styles.border)}>
      <div className="flex items-start justify-between gap-3">
        <div className={cn("grid size-8 place-items-center rounded-lg", styles.icon)}><Icon className="size-4" strokeWidth={2} /></div>
        <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-bold", favorable === null ? "bg-slate-100 text-slate-500" : favorable ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
          <TrendIcon className="size-3" />{metric.trend.toLocaleString("vi-VN")}%
        </span>
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">{metric.label}</p><p className={cn("mt-1 text-[27px] font-extrabold leading-none tracking-tight", styles.value)}>{metric.value.toLocaleString("vi-VN")} {metric.unit && <span className="text-base font-bold">{metric.unit}</span>}</p></div>
      </div>
      <p className="mt-2 truncate text-[11px] font-medium text-slate-500" title={metric.comparison}>{metric.supportingText}</p>
    </Card>
  );
}
