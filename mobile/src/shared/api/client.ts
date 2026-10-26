import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

import { supabase } from '@/shared/lib/supabase';

type AuthMode = 'none' | 'optional' | 'required';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | null | undefined>;
  auth?: AuthMode;
  idempotencyKey?: string;
}

export interface ApiErrorBody {
  code?: string;
  message?: string;
  correlationId?: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly code?: string;
  readonly correlationId?: string;
  readonly details?: unknown;

  constructor(
    message: string,
    public readonly status: number,
    public readonly data?: ApiErrorBody | string
  ) {
    super(message);
    this.name = 'ApiError';
    if (data && typeof data === 'object') {
      this.code = data.code;
      this.correlationId = data.correlationId;
      this.details = data.details;
    }
  }
}

export class AuthenticationRequiredError extends ApiError {
  constructor() {
    super('Bạn cần đăng nhập để thực hiện thao tác này.', 401, {
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication is required.',
    });
    this.name = 'AuthenticationRequiredError';
  }
}

/**
 * Automatically detects the host IP of the machine running Expo/Metro.
 * This allows a development build on a physical device to reach local services.
 */
export function getDevHost(): string | null {
  try {
    const rawHost =
      (Constants as any)?.expoGoConfig?.debuggerHost ??
      (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ??
      (Constants as any)?.manifest?.debuggerHost ??
      Constants?.expoConfig?.hostUri;

    if (rawHost && typeof rawHost === 'string') {
      const ip = rawHost.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') return ip;
    }

    const expUrl = (Constants as any)?.experienceUrl ?? (Constants as any)?.linkingUri;
    if (expUrl && typeof expUrl === 'string') {
      const match = expUrl.match(/^[a-zA-Z]+:\/\/([^:/]+)/);
      if (match?.[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch {
    // Expo constants are unavailable in Node-based unit tests.
  }

  try {
    const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL;
    if (scriptURL && typeof scriptURL === 'string') {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match?.[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch {
    // React Native native modules are unavailable in Node-based unit tests.
  }

  return null;
}

export function resolveServiceUrl(port: number, envOverride?: string): string {
  if (envOverride?.startsWith('https://')) return envOverride.replace(/\/$/, '');

  const devHost = getDevHost();
  if (devHost) return `http://${devHost}:${port}`;
  if (envOverride) return envOverride.replace(/\/$/, '');

  return Platform?.OS === 'android'
    ? `http://10.0.2.2:${port}`
    : `http://localhost:${port}`;
}

function responseMessage(status: number, data: ApiErrorBody | string): string {
  if (typeof data === 'object' && data.message) return data.message;
  if (typeof data === 'string' && data.trim()) return data;
  return `Request failed with status ${status}`;
}

async function accessToken(auth: AuthMode): Promise<string | null> {
  if (auth === 'none') return null;

  const { data, error } = await supabase.auth.getSession();
  if (error && auth === 'required') throw new AuthenticationRequiredError();

  const token = data.session?.access_token ?? null;
  if (!token && auth === 'required') throw new AuthenticationRequiredError();
  return token;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const {
    params,
    headers,
    auth = 'optional',
    idempotencyKey,
    ...rest
  } = options;
  const baseUrl = resolveServiceUrl(5256, process.env.EXPO_PUBLIC_API_URL);
  let url = `${baseUrl}${endpoint}`;

  if (params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) query.append(key, String(value));
    });
    const queryString = query.toString();
    if (queryString) url += `${url.includes('?') ? '&' : '?'}${queryString}`;
  }

  const token = await accessToken(auth);
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');
  if (rest.body != null && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
  if (idempotencyKey) requestHeaders.set('Idempotency-Key', idempotencyKey);

  let response: Response;
  try {
    response = await fetch(url, { ...rest, headers: requestHeaders });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : 'Không thể kết nối máy chủ.',
      0,
      { code: 'NETWORK_ERROR', message: 'Không thể kết nối máy chủ.' }
    );
  }

  if (!response.ok) {
    let errorData: ApiErrorBody | string;
    try {
      errorData = (await response.json()) as ApiErrorBody;
    } catch {
      errorData = await response.text();
    }
    throw new ApiError(responseMessage(response.status, errorData), response.status, errorData);
  }

  if (response.status === 204) return {} as T;
  return response.json() as Promise<T>;
}

const IDEMPOTENCY_PREFIX = 'wf02:idempotency:';
const idempotencyLookups = new Map<string, Promise<PendingIdempotency>>();

interface PendingIdempotency {
  key: string;
  fingerprint: string;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = stableValue((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }
  return value;
}

function fingerprint(value: unknown): string {
  const input = JSON.stringify(stableValue(value));
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function createIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

async function pendingIdempotency(operationId: string, body: unknown): Promise<PendingIdempotency> {
  const storageKey = `${IDEMPOTENCY_PREFIX}${operationId}`;
  const bodyFingerprint = fingerprint(body);
  const saved = await AsyncStorage.getItem(storageKey);

  if (saved) {
    try {
      const pending = JSON.parse(saved) as PendingIdempotency;
      if (pending.fingerprint === bodyFingerprint && pending.key) return pending;
    } catch {
      // Replace corrupt local state with a new operation key.
    }
  }

  const pending = { key: createIdempotencyKey(), fingerprint: bodyFingerprint };
  await AsyncStorage.setItem(storageKey, JSON.stringify(pending));
  return pending;
}

function isFinalResponse(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 429;
}

/**
 * Reuses one Idempotency-Key for the same logical write and payload. The key is
 * retained after network/5xx/429 failures and cleared only after a final response.
 */
async function postIdempotent<T>(
  endpoint: string,
  body: unknown,
  operationId: string,
  options: RequestOptions = {}
): Promise<T> {
  const storageKey = `${IDEMPOTENCY_PREFIX}${operationId}`;
  let lookup = idempotencyLookups.get(operationId);
  if (!lookup) {
    lookup = pendingIdempotency(operationId, body);
    idempotencyLookups.set(operationId, lookup);
  }
  const pending = await lookup;

  try {
    const result = await request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      idempotencyKey: pending.key,
    });
    await AsyncStorage.removeItem(storageKey);
    return result;
  } catch (error) {
    if (isFinalResponse(error)) await AsyncStorage.removeItem(storageKey);
    throw error;
  } finally {
    idempotencyLookups.delete(operationId);
  }
}

/** Multipart helper for the WF-01 AI service; it intentionally does not attach app auth. */
export async function postMultipart<T = unknown>(
  url: string,
  formData: FormData,
  timeoutMs = 15_000,
  retries = 1
): Promise<T> {
  const attempt = async (): Promise<T> => {
    // Use standard fetch first (native OkHttp streaming on Android, handles FormData reliably)
    if (typeof fetch === 'function') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
          },
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          try {
            return (await response.json()) as T;
          } catch {
            return (await response.text()) as unknown as T;
          }
        }
        const errText = await response.text().catch(() => '');
        throw new Error(`Server responded with status ${response.status}: ${errText}`);
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (controller.signal.aborted) {
          throw new Error(`Request timed out after ${timeoutMs}ms`);
        }
        // If server returned a 4xx/5xx HTTP error, do not retry with XHR
        if (fetchErr.message?.startsWith('Server responded with status')) {
          throw fetchErr;
        }
      }
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.timeout = timeoutMs;
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(xhr.responseText as T);
          }
        } else {
          reject(new Error(`Server responded with status ${xhr.status}: ${xhr.responseText}`));
        }
      };
      xhr.onerror = () => reject(new Error(`Network request failed to ${url} (status: ${xhr.status || 'aborted/offline'})`));
      xhr.ontimeout = () => reject(new Error(`Request timed out after ${timeoutMs}ms`));
      xhr.send(formData as any);
    });
  };

  try {
    return await attempt();
  } catch (err: any) {
    if (retries > 0 && !err?.message?.startsWith('Server responded with status')) {
      await new Promise((r) => setTimeout(r, 400));
      return postMultipart(url, formData, timeoutMs, retries - 1);
    }
    throw err;
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  postIdempotent,
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
