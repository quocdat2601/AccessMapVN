import type { DashboardData } from "@/entities/dashboard";
import { Skeleton } from "@/shared/ui/skeleton";
import { VolumeTrendChart } from "./volume-trend-chart";

export function AnalyticsGrid({ data, isLoading }: { data?: DashboardData; isLoading?: boolean }) {
  if (isLoading || !data) return <Skeleton className="h-[348px]" />;
  return (
    <section aria-labelledby="analytics-title">
      <h2 id="analytics-title" className="sr-only">Phân tích vận hành</h2>
      <VolumeTrendChart data={data.trends} summary={data.summary} rangeLabel={data.rangeLabel} />
    </section>
  );
}
