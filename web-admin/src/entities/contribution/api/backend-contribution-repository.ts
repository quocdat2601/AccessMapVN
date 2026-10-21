"use client";

import { apiRequest } from "@/shared/api/api-client";
import type { ContributionRepository } from "./contribution-repository";
import type {
  ApproveContributionInput,
  ContributionDetail,
  ContributionNavigation,
  ContributionQueueQuery,
  ContributionQueueResponse,
  RequestMoreInfoInput,
} from "../model/types";

function buildQueryString(query: ContributionQueueQuery = {}) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.type && query.type !== "all") params.set("type", query.type);
  if (query.reason && query.reason !== "all") params.set("reason", query.reason);
  if (query.category && query.category !== "all") params.set("category", query.category);
  if (query.warning && query.warning !== "all") params.set("warning", query.warning);
  if (query.date && query.date !== "all") params.set("date", query.date);
  if (query.view && query.view !== "all") params.set("view", query.view);
  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));

  const str = params.toString();
  return str ? `?${str}` : "";
}

class BackendContributionRepository implements ContributionRepository {
  async getQueue(
    query: ContributionQueueQuery = {},
    signal?: AbortSignal,
  ): Promise<ContributionQueueResponse> {
    const response = await apiRequest<ContributionQueueResponse>(
      `/api/v1/admin/submissions${buildQueryString(query)}`,
      { signal },
    );
    return response.data;
  }

  async getById(id: string, signal?: AbortSignal): Promise<ContributionDetail | null> {
    try {
      const response = await apiRequest<ContributionDetail>(
        `/api/v1/admin/submissions/${encodeURIComponent(id)}`,
        { signal },
      );
      return response.data;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 404) {
        return null;
      }
      throw err;
    }
  }

  async getNavigation(id: string): Promise<ContributionNavigation> {
    try {
      const response = await apiRequest<ContributionNavigation>(
        `/api/v1/admin/submissions/${encodeURIComponent(id)}/navigation`,
      );
      return response.data;
    } catch {
      return {
        current: 1,
        total: 1,
      };
    }
  }

  async approve(id: string, input: ApproveContributionInput): Promise<ContributionDetail> {
    const response = await apiRequest<ContributionDetail>(
      `/api/v1/admin/submissions/${encodeURIComponent(id)}/approve`,
      {
        method: "POST",
        body: input,
      },
    );
    return response.data;
  }

  async requestMoreInfo(id: string, input: RequestMoreInfoInput): Promise<ContributionDetail> {
    const response = await apiRequest<ContributionDetail>(
      `/api/v1/admin/submissions/${encodeURIComponent(id)}/request-info`,
      {
        method: "POST",
        body: input,
      },
    );
    return response.data;
  }

  async reject(id: string, reason: string): Promise<ContributionDetail> {
    const response = await apiRequest<ContributionDetail>(
      `/api/v1/admin/submissions/${encodeURIComponent(id)}/reject`,
      {
        method: "POST",
        body: { reason },
      },
    );
    return response.data;
  }

  async sendReminder(id: string): Promise<ContributionDetail> {
    const response = await apiRequest<ContributionDetail>(
      `/api/v1/admin/submissions/${encodeURIComponent(id)}/remind`,
      {
        method: "POST",
      },
    );
    return response.data;
  }
}

export const backendContributionRepository = new BackendContributionRepository();
