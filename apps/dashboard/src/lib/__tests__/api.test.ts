import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, setAccessToken, clearAccessToken, ApiClientError } from '../api';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  describe('apiClient', () => {
    it('should make GET request by default', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { id: '1' } }),
      });

      const result = await apiClient('/api/test');

      expect(result.data).toEqual({ id: '1' });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({ method: 'GET', credentials: 'include' }),
      );
    });

    it('should include Authorization header when token exists', async () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('test-token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      await apiClient('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        }),
      );
    });

    it('should send JSON body for POST requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      await apiClient('/api/test', { method: 'POST', body: { name: 'test' } });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });

    it('should throw ApiClientError on non-OK response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }),
      });

      await expect(apiClient('/api/missing')).rejects.toThrow(ApiClientError);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }),
      });
      try {
        await apiClient('/api/missing');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError);
        expect((err as ApiClientError).code).toBe('NOT_FOUND');
        expect((err as ApiClientError).status).toBe(404);
      }
    });

    it('should auto-refresh token on 401 and retry', async () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('expired-token');

      mockFetch
        // First call: 401
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token expired' } }),
        })
        // Refresh call: success
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { accessToken: 'new-token' } }),
        })
        // Retry call: success
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { id: '1' } }),
        });

      const result = await apiClient('/api/test');

      expect(result.data).toEqual({ id: '1' });
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(localStorage.setItem).toHaveBeenCalledWith('access_token', 'new-token');
    });

    it('should not refresh on 401 for auth endpoints', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ success: false, error: { code: 'UNAUTHORIZED', message: 'Bad credentials' } }),
      });

      await expect(apiClient('/api/auth/login', { method: 'POST', body: {} })).rejects.toThrow(ApiClientError);
      // Only 1 call, no refresh attempt
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should include pagination when present', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 100, totalPages: 5 },
        }),
      });

      const result = await apiClient('/api/list');

      expect(result.pagination).toBeDefined();
      expect(result.pagination!.total).toBe(100);
    });
  });

  describe('setAccessToken', () => {
    it('should store token in localStorage', () => {
      setAccessToken('my-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('access_token', 'my-token');
    });
  });

  describe('clearAccessToken', () => {
    it('should remove token from localStorage', () => {
      clearAccessToken();
      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
    });
  });

  describe('ApiClientError', () => {
    it('should have correct properties', () => {
      const err = new ApiClientError('Test error', 'NOT_FOUND', 404);
      expect(err.message).toBe('Test error');
      expect(err.code).toBe('NOT_FOUND');
      expect(err.status).toBe(404);
      expect(err.name).toBe('ApiClientError');
    });
  });
});
