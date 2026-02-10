import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

vi.mock('@/lib/api', () => ({
  apiClient: vi.fn(),
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
}));

import { AuthProvider, useAuth } from '../AuthProvider';
import { apiClient } from '@/lib/api';

const mockApiClient = vi.mocked(apiClient);

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

const mockUser = {
  id: 'user-1', email: 'admin@synap6ia.com', firstName: 'Admin', lastName: 'User',
  role: 'owner' as const, notificationPreferences: { slack: true, email: true, whatsapp: false },
  createdAt: '2025-01-01', updatedAt: '2025-01-01',
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: refresh fails (not authenticated)
    mockApiClient.mockRejectedValue(new Error('Not authenticated'));
  });

  it('should start loading and attempt refresh', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should authenticate after successful login', async () => {
    // Refresh fails, then login succeeds
    mockApiClient.mockRejectedValueOnce(new Error('No session'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockApiClient.mockResolvedValueOnce({
      success: true,
      data: { accessToken: 'new-token', user: mockUser },
    } as any);

    await act(async () => {
      await result.current.login('admin@synap6ia.com', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('admin@synap6ia.com');
  });

  it('should clear state on logout', async () => {
    // Refresh succeeds
    mockApiClient.mockResolvedValueOnce({
      success: true,
      data: { accessToken: 'token', user: mockUser },
    } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Logout
    mockApiClient.mockResolvedValueOnce({ success: true, data: {} } as any);
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should handle register', async () => {
    mockApiClient.mockRejectedValueOnce(new Error('No session'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockApiClient.mockResolvedValueOnce({
      success: true,
      data: { accessToken: 'new-token', user: mockUser },
    } as any);

    await act(async () => {
      await result.current.register({
        email: 'admin@synap6ia.com', password: 'pass', firstName: 'Admin', lastName: 'User',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should throw when useAuth is used outside provider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });
});
