import type { ApiResponse, ApiError } from '@synap6ia/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {} } = options;

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

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
