import type { DashboardData } from "@/entities/dashboard";
import { Skeleton } from "@/shared/ui/skeleton";
import { AiOutcomes } from "./ai-outcomes";
import { BacklogAging } from "./backlog-aging";
import { RecentLocations } from "./recent-locations";

export function InsightsGrid({ data, isLoading }: { data?: DashboardData; isLoading?: boolean }) {
  if (isLoading || !data) return <div className="grid gap-3 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-[165px]" />)}</div>;
  return <section aria-labelledby="insights-title"><h2 id="insights-title" className="sr-only">Thông tin bổ sung</h2><div className="grid gap-3 lg:grid-cols-3"><BacklogAging data={data.backlogAging} /><AiOutcomes data={data.aiOutcomes} /><RecentLocations data={data.recentLocations} summary={data.summary} /></div></section>;
}
