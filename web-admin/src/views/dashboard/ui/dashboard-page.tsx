"use client";

import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { useDashboardData } from "@/features/dashboard-filters/model/use-dashboard-data";
import { DateRangeFilter } from "@/features/dashboard-filters/ui/date-range-filter";
import { AnalyticsGrid } from "@/widgets/dashboard-analytics";
import { KpiGrid } from "@/widgets/dashboard-kpis";
import { InsightsGrid } from "@/widgets/dashboard-insights";
import { PriorityList } from "@/widgets/operational-priorities";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

export function DashboardPage() {
  const { range, setRange, data, isLoading, error, retry } = useDashboardData();

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 p-4 sm:px-5 sm:py-4 xl:px-6">
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-950">Tổng quan vận hành</h1>
            <Badge variant="teal" className="gap-1"><ShieldCheck className="size-3" />TP.HCM & Hà Nội</Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Tình hình kiểm duyệt và chất lượng dữ liệu tiếp cận hôm nay.</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {data && !isLoading && <p className="hidden text-right text-[11px] leading-4 text-slate-400 md:block">Cập nhật gần nhất<br /><span className="font-medium text-slate-600">{data.generatedAt}</span></p>}
          <DateRangeFilter value={range} onChange={setRange} />
        </div>
      </section>

      {error ? (
        <div role="alert" className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-red-200 bg-white p-8 text-center">
          <div className="grid size-11 place-items-center rounded-full bg-red-50 text-red-600"><AlertTriangle className="size-5" /></div>
          <h2 className="mt-4 text-base font-bold text-slate-950">Không tải được bảng điều hành</h2>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <Button className="mt-4" onClick={retry}><RefreshCw className="size-4" />Thử lại</Button>
        </div>
      ) : (
        <>
          <KpiGrid metrics={data?.metrics} isLoading={isLoading} />
          <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(390px,.85fr)]">
            <AnalyticsGrid data={data ?? undefined} isLoading={isLoading} />
            <section aria-labelledby="priorities-title" className="min-w-0">
              <h2 id="priorities-title" className="sr-only">Cần hành động ngay</h2>
              <PriorityList items={data?.priorities} workflow={data?.workflow} isLoading={isLoading} />
            </section>
          </div>
          <InsightsGrid data={data ?? undefined} isLoading={isLoading} />
        </>
      )}
    </div>
  );
}
