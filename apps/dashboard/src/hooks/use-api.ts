'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import type { Pagination } from '@synap6ia/shared';

interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  pagination: Pagination | null;
  mutate: () => Promise<void>;
}

export function useApi<T>(endpoint: string | null): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!!endpoint);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchData = useCallback(async () => {
    if (!endpoint) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient<T>(endpoint);
      setData(response.data);
      setPagination(response.pagination ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, error, isLoading, pagination, mutate: fetchData };
}
