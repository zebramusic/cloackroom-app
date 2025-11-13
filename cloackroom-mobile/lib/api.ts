import Constants from 'expo-constants';

const envUrl = process.env.EXPO_PUBLIC_API_URL;
const extraUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
const baseUrl = (envUrl || extraUrl || '').replace(/\/$/, '');

export function getApiBaseUrl() {
  if (!baseUrl) throw new Error('Missing EXPO_PUBLIC_API_URL');
  return baseUrl;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function resolveUrl(path: string) {
  if (/^https?:/i.test(path)) return path;
  if (!baseUrl) throw new Error('Missing EXPO_PUBLIC_API_URL');
  if (!path.startsWith('/')) return `${baseUrl}/${path}`;
  return `${baseUrl}${path}`;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = resolveUrl(path);
  const headers = new Headers(options.headers);
  if (!headers.has('content-type') && options.body) {
    headers.set('content-type', 'application/json');
  }
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
  const text = await res.text();
  const data = text ? (() => {
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      throw new ApiError(res.status, 'Invalid JSON response', text);
    }
  })() : (undefined as T | undefined);
  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)
        ? (data as { error?: string }).error
        : undefined) || res.statusText || 'Request failed';
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}
