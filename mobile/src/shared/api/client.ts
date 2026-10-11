import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

/**
 * Automatically detects the host IP of the machine running Expo/Metro.
 * When developing on physical devices, this eliminates the need to change .env
 * whenever switching Wi-Fi networks.
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
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }

    const expUrl = (Constants as any)?.experienceUrl ?? (Constants as any)?.linkingUri;
    if (expUrl && typeof expUrl === 'string') {
      const match = expUrl.match(/^[a-zA-Z]+:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch {
    // Ignore in non-Expo / Node test environments
  }

  try {
    const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL;
    if (scriptURL && typeof scriptURL === 'string') {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch {
    // Ignore in non-RN / Node test environments
  }

  return null;
}

export function resolveServiceUrl(port: number, envOverride?: string): string {
  // 1. Explicit HTTPS remote / tunnel URLs take priority
  if (envOverride?.startsWith('https://')) {
    return envOverride;
  }

  // 2. Auto-detect host IP from Metro dev server (works across any Wi-Fi on physical devices)
  const devHost = getDevHost();
  if (devHost) {
    const url = `http://${devHost}:${port}`;
    console.log(`[resolveServiceUrl] Resolved port ${port} -> ${url} (devHost: ${devHost})`);
    return url;
  }

  // 3. Fallback to envOverride if provided
  if (envOverride) {
    return envOverride;
  }

  // 4. Default emulator / localhost fallback
  const isAndroid = Platform?.OS === 'android';
  const fallback = isAndroid ? `http://10.0.2.2:${port}` : `http://localhost:${port}`;
  console.log(`[resolveServiceUrl] Fallback port ${port} -> ${fallback} (devHost is null)`);
  return fallback;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | null | undefined>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Uploads multipart FormData containing native file URIs using React Native's XMLHttpRequest.
 * Bypasses Expo SDK 57's Winter fetch which throws 'Unsupported FormDataPart implementation'
 * when encountering { uri, name, type } entries.
 */
export function postMultipart<T = any>(
  url: string,
  formData: FormData,
  timeoutMs: number = 15000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText);
          resolve(parsed);
        } catch {
          resolve(xhr.responseText as unknown as T);
        }
      } else {
        reject(new Error(`Server responded with status ${xhr.status}: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network request failed via XMLHttpRequest'));
    };

    xhr.ontimeout = () => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    };

    xhr.send(formData as any);
  });
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...rest } = options;
  const baseUrl = resolveServiceUrl(5256, process.env.EXPO_PUBLIC_API_URL);
  let url = `${baseUrl}${endpoint}`;

  if (params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const response = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
  });

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }
    throw new ApiError(
      `Request failed with status ${response.status}`,
      response.status,
      errorData
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
