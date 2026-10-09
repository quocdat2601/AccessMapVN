import type { DashboardMetric } from "@/entities/dashboard";
import { Skeleton } from "@/shared/ui/skeleton";
import { MetricCard } from "./metric-card";

export function KpiGrid({ metrics, isLoading }: { metrics?: DashboardMetric[]; isLoading?: boolean }) {
  return (
    <section aria-labelledby="key-metrics-title">
      <h2 id="key-metrics-title" className="sr-only">Chỉ số vận hành chính</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || !metrics
          ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[132px]" />)
          : metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}
      </div>
    </section>
  );
}
