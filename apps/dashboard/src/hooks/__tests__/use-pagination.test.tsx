import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../use-pagination';

describe('usePagination', () => {
  it('should use default values (page 1, limit 20)', () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(20);
  });

  it('should accept custom initial values', () => {
    const { result } = renderHook(() => usePagination(3, 50));
    expect(result.current.page).toBe(3);
    expect(result.current.limit).toBe(50);
  });

  it('should update page', () => {
    const { result } = renderHook(() => usePagination());

    act(() => { result.current.setPage(5); });
    expect(result.current.page).toBe(5);
  });

  it('should reset page to 1 when limit changes', () => {
    const { result } = renderHook(() => usePagination());

    act(() => { result.current.setPage(3); });
    expect(result.current.page).toBe(3);

    act(() => { result.current.setLimit(50); });
    expect(result.current.limit).toBe(50);
    expect(result.current.page).toBe(1); // reset
  });

  it('should generate correct queryString', () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.queryString).toBe('page=1&limit=20');

    act(() => { result.current.setPage(2); });
    expect(result.current.queryString).toBe('page=2&limit=20');

    act(() => { result.current.setLimit(10); });
    expect(result.current.queryString).toBe('page=1&limit=10');
  });
});
