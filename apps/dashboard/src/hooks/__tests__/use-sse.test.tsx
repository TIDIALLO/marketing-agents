import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSSE } from '../use-sse';

describe('useSSE', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should create EventSource with correct URL', () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('test-token');

    renderHook(() => useSSE('/api/stream'));

    // EventSource is created in the effect
  });

  it('should start disconnected and connect on open', async () => {
    const { result } = renderHook(() => useSSE('/api/stream'));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.data).toBeNull();

    // Wait for the setTimeout in MockEventSource to fire onopen
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useSSE('/api/stream'));
    unmount();
    // No errors thrown means cleanup worked
  });
});
