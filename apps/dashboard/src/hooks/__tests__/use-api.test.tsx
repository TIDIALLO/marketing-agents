import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/lib/api', () => ({
  apiClient: vi.fn(),
}));

import { useApi } from '../use-api';
import { apiClient } from '@/lib/api';

const mockApiClient = vi.mocked(apiClient);

describe('useApi', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should fetch data on mount', async () => {
    mockApiClient.mockResolvedValue({ success: true, data: { items: [1, 2, 3] } } as any);

    const { result } = renderHook(() => useApi('/api/test'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({ items: [1, 2, 3] });
    expect(result.current.error).toBeNull();
  });

  it('should handle errors', async () => {
    mockApiClient.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useApi('/api/fail'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('should not fetch when endpoint is null', () => {
    const { result } = renderHook(() => useApi(null));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('should expose pagination', async () => {
    mockApiClient.mockResolvedValue({
      success: true,
      data: [],
      pagination: { page: 1, limit: 20, total: 50, totalPages: 3 },
    } as any);

    const { result } = renderHook(() => useApi('/api/list'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pagination).toEqual({ page: 1, limit: 20, total: 50, totalPages: 3 });
  });

  it('should refetch on mutate', async () => {
    mockApiClient.mockResolvedValue({ success: true, data: 'v1' } as any);

    const { result } = renderHook(() => useApi('/api/test'));

    await waitFor(() => {
      expect(result.current.data).toBe('v1');
    });

    mockApiClient.mockResolvedValue({ success: true, data: 'v2' } as any);
    await act(() => result.current.mutate());

    await waitFor(() => {
      expect(result.current.data).toBe('v2');
    });
  });
});
