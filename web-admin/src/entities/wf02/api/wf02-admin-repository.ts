"use client";

import { apiRequest, type ApiResponse } from "@/shared/api/api-client";
import type {
  AdminQueueQuery,
  AdminQueueResponse,
  CommentModerationInput,
  CommunityCommentQueueItem,
  DisputeDecisionInput,
  DisputeDetail,
  DisputeQueueItem,
  EvidenceAccess,
  MetadataCorrectionInput,
  ReportDetail,
  ReportQueueItem,
  ReportTransitionInput,
} from "../model/types";

function queryString(query: AdminQueueQuery = {}) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status && query.status !== "All") params.set("status", query.status);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}

function normalizeQueue<T>(payload: AdminQueueResponse<T> | T[], query: AdminQueueQuery) {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      total: payload.length,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? Math.max(payload.length, 1),
      totalPages: 1,
    } satisfies AdminQueueResponse<T>;
  }

  const pageSize = payload.pageSize || query.pageSize || 20;
  return {
    ...payload,
    items: payload.items ?? [],
    total: payload.total ?? payload.items?.length ?? 0,
    page: payload.page || query.page || 1,
    pageSize,
    totalPages:
      payload.totalPages ||
      Math.max(1, Math.ceil((payload.total ?? payload.items?.length ?? 0) / pageSize)),
  };
}

export const wf02AdminRepository = {
  async getDisputes(query: AdminQueueQuery = {}, signal?: AbortSignal) {
    const response = await apiRequest<AdminQueueResponse<DisputeQueueItem> | DisputeQueueItem[]>(
      `/api/v1/admin/community-disputes${queryString(query)}`,
      { signal },
    );
    return normalizeQueue(response.data, query);
  },

  getDispute(id: string, signal?: AbortSignal) {
    return apiRequest<DisputeDetail>(
      `/api/v1/admin/community-disputes/${encodeURIComponent(id)}`,
      { signal },
    );
  },

  decideDispute(
    id: string,
    input: DisputeDecisionInput,
    etag: string,
    idempotencyKey = crypto.randomUUID(),
  ) {
    return apiRequest<DisputeDetail>(
      `/api/v1/admin/community-disputes/${encodeURIComponent(id)}`,
      { method: "PATCH", body: input, etag, idempotencyKey },
    );
  },

  async getReports(query: AdminQueueQuery = {}, signal?: AbortSignal) {
    const response = await apiRequest<AdminQueueResponse<ReportQueueItem> | ReportQueueItem[]>(
      `/api/v1/admin/reports${queryString(query)}`,
      { signal },
    );
    return normalizeQueue(response.data, query);
  },

  getReport(id: string, signal?: AbortSignal) {
    return apiRequest<ReportDetail>(`/api/v1/admin/reports/${encodeURIComponent(id)}`, {
      signal,
    });
  },

  getEvidenceAccess(reportId: string, evidenceId: string) {
    return apiRequest<EvidenceAccess>(
      `/api/v1/admin/reports/${encodeURIComponent(reportId)}/evidence/${encodeURIComponent(evidenceId)}/access`,
    );
  },

  transitionReport(
    id: string,
    input: ReportTransitionInput,
    etag: string,
    idempotencyKey = crypto.randomUUID(),
  ) {
    return apiRequest<ReportDetail>(`/api/v1/admin/reports/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: input,
      etag,
      idempotencyKey,
    });
  },

  correctMetadata(
    locationId: string,
    input: MetadataCorrectionInput,
    etag: string,
    idempotencyKey = crypto.randomUUID(),
  ) {
    return apiRequest<{
      reportId: string;
      status: string;
      version: number;
      locationMetadataVersion: number;
      updatedAt: string;
    }>(
      `/api/v1/admin/locations/${encodeURIComponent(locationId)}/metadata`,
      { method: "PATCH", body: input, etag, idempotencyKey },
    );
  },

  async getComments(query: AdminQueueQuery = {}, signal?: AbortSignal) {
    const response = await apiRequest<
      AdminQueueResponse<CommunityCommentQueueItem> | CommunityCommentQueueItem[]
    >(`/api/v1/admin/comments${queryString(query)}`, { signal });
    return normalizeQueue(response.data, query);
  },

  moderateComment(
    locationId: string,
    commentId: string,
    input: CommentModerationInput,
    etag: string,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<ApiResponse<CommunityCommentQueueItem>> {
    return apiRequest<CommunityCommentQueueItem>(
      `/api/v1/admin/locations/${encodeURIComponent(locationId)}/comments/${encodeURIComponent(commentId)}/moderation`,
      { method: "POST", body: input, etag, idempotencyKey },
    );
  },
};
