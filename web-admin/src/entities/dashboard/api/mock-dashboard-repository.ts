import type { DashboardData, DateRangeKey } from "../model/types";
import type { DashboardRepository } from "./dashboard-repository";
import { mockDashboardData } from "./mock-dashboard-data";

const MOCK_LATENCY_MS = 420;

class MockDashboardRepository implements DashboardRepository {
  async getDashboard(range: DateRangeKey, signal?: AbortSignal): Promise<DashboardData> {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(resolve, MOCK_LATENCY_MS);
      signal?.addEventListener("abort", () => {
        window.clearTimeout(timeout);
        reject(new DOMException("Đã hủy yêu cầu", "AbortError"));
      }, { once: true });
    });

    return structuredClone(mockDashboardData[range]);
  }
}

export const dashboardRepository: DashboardRepository = new MockDashboardRepository();
