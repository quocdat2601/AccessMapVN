import type { DashboardData, DateRangeKey } from "../model/types";

export interface DashboardRepository {
  getDashboard(range: DateRangeKey, signal?: AbortSignal): Promise<DashboardData>;
}
