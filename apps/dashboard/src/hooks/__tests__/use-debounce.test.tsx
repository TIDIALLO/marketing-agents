import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../use-debounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello'));
    expect(result.current).toBe('hello');
  });

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    );

    expect(result.current).toBe('a');

    rerender({ value: 'ab' });
    expect(result.current).toBe('a'); // still old value

    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe('a'); // still waiting

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('ab'); // now updated
  });

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'ab' });
    act(() => { vi.advanceTimersByTime(200); });

    rerender({ value: 'abc' }); // resets timer
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe('a'); // still old — timer reset

    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('abc'); // final value
  });

  it('should use default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'x' } },
    );

    rerender({ value: 'y' });

    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe('x');

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('y');
  });

  it('should support custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'start' } },
    );

    rerender({ value: 'end' });

    act(() => { vi.advanceTimersByTime(499); });
    expect(result.current).toBe('start');

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('end');
  });
});
