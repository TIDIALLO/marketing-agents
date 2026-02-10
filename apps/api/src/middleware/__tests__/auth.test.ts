import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../auth';
import { generateAccessToken } from '../../lib/jwt';
import { AppError } from '../../lib/errors';
import type { JwtPayload } from '@synap6ia/shared';

function createMockReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

const mockRes = {} as Response;

describe('authMiddleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('should reject requests without Authorization header', () => {
    authMiddleware(createMockReq(), mockRes, next);

    expect(next).toHaveBeenCalledOnce();
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('should reject requests without Bearer prefix', () => {
    authMiddleware(createMockReq({ authorization: 'Basic abc123' }), mockRes, next);

    expect(next).toHaveBeenCalledOnce();
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });

  it('should reject invalid tokens', () => {
    authMiddleware(createMockReq({ authorization: 'Bearer invalid-token' }), mockRes, next);

    expect(next).toHaveBeenCalledOnce();
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('should set req.user and call next() for valid tokens', () => {
    const payload: JwtPayload = {
      userId: 'u-1',
      role: 'admin',
      email: 'test@synap6ia.com',
    };
    const token = generateAccessToken(payload);
    const req = createMockReq({ authorization: `Bearer ${token}` });

    authMiddleware(req, mockRes, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeDefined();
    expect(req.user!.userId).toBe('u-1');
    expect(req.user!.role).toBe('admin');
  });
});
