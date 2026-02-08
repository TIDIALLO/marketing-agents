'use client';

import { useCallback, useState } from 'react';

interface UsePaginationResult {
  page: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  queryString: string;
}

export function usePagination(initialPage = 1, initialLimit = 20): UsePaginationResult {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimitState] = useState(initialLimit);

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit);
    setPage(1);
  }, []);

  const queryString = `page=${page}&limit=${limit}`;

  return { page, limit, setPage, setLimit, queryString };
}
