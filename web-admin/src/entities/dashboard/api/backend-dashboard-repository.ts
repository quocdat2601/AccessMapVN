"use client";

import { apiRequest } from "@/shared/api/api-client";
import type { DashboardData, DateRangeKey } from "../model/types";
import type { DashboardRepository } from "./dashboard-repository";

export class BackendDashboardRepository implements DashboardRepository {
  async getDashboard(range: DateRangeKey, signal?: AbortSignal): Promise<DashboardData> {
    const response = await apiRequest<DashboardData>(
      `/api/v1/admin/dashboard?range=${encodeURIComponent(range)}`,
      { signal },
    );
    return response.data;
  }
}

export const backendDashboardRepository: DashboardRepository = new BackendDashboardRepository();
