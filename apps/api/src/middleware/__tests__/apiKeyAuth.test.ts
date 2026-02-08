import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

describe('apiKeyAuth', () => {
  let next: NextFunction;
  let mockRes: Response;

  function createReq(headers: Record<string, string> = {}): Request {
    return { headers } as unknown as Request;
  }

  function createRes() {
    const res: Partial<Response> = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    return res as Response;
  }

  beforeEach(() => {
    next = vi.fn();
    mockRes = createRes();
    vi.resetModules();
  });

  it('should pass through in dev mode (no key configured)', async () => {
    vi.stubEnv('N8N_API_KEY', '');
    const { apiKeyAuth } = await import('../apiKeyAuth');

    apiKeyAuth(createReq(), mockRes, next);

    expect(next).toHaveBeenCalledWith();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should reject requests without API key when key is configured', async () => {
    vi.stubEnv('N8N_API_KEY', 'secret-api-key-123');
    const { apiKeyAuth } = await import('../apiKeyAuth');

    apiKeyAuth(createReq(), mockRes, next);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject requests with wrong API key', async () => {
    vi.stubEnv('N8N_API_KEY', 'secret-api-key-123');
    const { apiKeyAuth } = await import('../apiKeyAuth');

    apiKeyAuth(createReq({ 'x-api-key': 'wrong-key' }), mockRes, next);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should accept requests with correct API key', async () => {
    vi.stubEnv('N8N_API_KEY', 'secret-api-key-123');
    const { apiKeyAuth } = await import('../apiKeyAuth');

    apiKeyAuth(createReq({ 'x-api-key': 'secret-api-key-123' }), mockRes, next);

    expect(next).toHaveBeenCalledWith();
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});
