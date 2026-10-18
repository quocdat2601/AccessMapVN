"use client";

import { getApiBaseUrl } from "@/shared/config/runtime";
import { createBrowserSupabaseClient } from "@/shared/lib/supabase/client";

export interface ApiProblemDetails {
  code?: string;
  message?: string;
  correlationId?: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly correlationId?: string;
  readonly details?: unknown;

  constructor(status: number, problem: ApiProblemDetails = {}) {
    super(problem.message || `Yêu cầu thất bại (${status}).`);
    this.name = "ApiError";
    this.status = status;
    this.code = problem.code;
    this.correlationId = problem.correlationId;
    this.details = problem.details;
  }

  get isConcurrencyConflict() {
    return (
      this.status === 409 ||
      this.status === 412 ||
      this.code === "CONCURRENCY_CONFLICT" ||
      this.code === "STALE_VERSION"
    );
  }
}

export interface ApiResponse<T> {
  data: T;
  etag?: string;
}

interface ApiRequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: unknown;
  etag?: string;
  idempotencyKey?: string;
  headers?: HeadersInit;
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

async function parsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json") || contentType.includes("+json")) {
    return response.json().catch(() => undefined);
  }

  const text = await response.text();
  return text || undefined;
}

function toProblem(payload: unknown): ApiProblemDetails {
  if (!payload || typeof payload !== "object") {
    return typeof payload === "string" ? { message: payload } : {};
  }

  const value = payload as Record<string, unknown>;
  return {
    code: typeof value.code === "string" ? value.code : undefined,
    message:
      typeof value.message === "string"
        ? value.message
        : typeof value.title === "string"
          ? value.title
          : undefined,
    correlationId:
      typeof value.correlationId === "string" ? value.correlationId : undefined,
    details: value.details ?? value.errors,
  };
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new ApiError(0, {
      code: "API_NOT_CONFIGURED",
      message: "Chưa cấu hình NEXT_PUBLIC_API_BASE_URL.",
    });
  }

  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new ApiError(401, {
      code: "AUTHENTICATION_REQUIRED",
      message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    });
  }

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.etag) headers.set("If-Match", options.etag);
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);

  const response = await fetch(`${apiBaseUrl}${normalizePath(path)}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });
  const payload = await parsePayload(response);

  if (!response.ok) throw new ApiError(response.status, toProblem(payload));

  return {
    data: payload as T,
    etag: response.headers.get("etag") ?? undefined,
  };
}
