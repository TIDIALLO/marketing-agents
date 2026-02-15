import type { ApiResponse, ApiError } from '@mktengine/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function setAccessToken(token: string): void {
  localStorage.setItem('access_token', token);
}

export function clearAccessToken(): void {
  localStorage.removeItem('access_token');
}

// Prevent multiple concurrent refresh requests
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const data = await res.json();
      setAccessToken(data.data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function doFetch(endpoint: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', body, headers = {} } = options;

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  let response = await doFetch(endpoint, options);

  // On 401, try refreshing the token once and retry
  if (response.status === 401 && !endpoint.includes('/api/auth/')) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await doFetch(endpoint, options);
    }
  }

  const data = await response.json();

  if (!response.ok) {
    const error = data as ApiError;
    throw new ApiClientError(
      error.error?.message ?? 'Une erreur est survenue',
      error.error?.code ?? 'INTERNAL_ERROR',
      response.status,
    );
  }

  return data as ApiResponse<T>;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}
