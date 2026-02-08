import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireRole, requirePermission } from '../requireRole';
import { AppError } from '../../lib/errors';
import type { JwtPayload } from '@synap6ia/shared';

function createReqWithRole(role: JwtPayload['role']): Request {
  return {
    user: { userId: 'u-1', tenantId: 't-1', role, email: 'test@synap6ia.com' },
  } as unknown as Request;
}

const mockRes = {} as Response;

describe('requireRole', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('should allow access when user has one of the required roles', () => {
    const middleware = requireRole('admin', 'owner');
    middleware(createReqWithRole('admin'), mockRes, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should deny access when user does not have the required role', () => {
    const middleware = requireRole('owner');
    middleware(createReqWithRole('viewer'), mockRes, next);

    expect(next).toHaveBeenCalledOnce();
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('should allow owner for all role checks', () => {
    const middleware = requireRole('owner', 'admin', 'editor', 'viewer');
    middleware(createReqWithRole('owner'), mockRes, next);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('requirePermission', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('should allow owner to manage tenant', () => {
    const middleware = requirePermission('tenant:manage');
    middleware(createReqWithRole('owner'), mockRes, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should deny viewer from creating content', () => {
    const middleware = requirePermission('content:create');
    middleware(createReqWithRole('viewer'), mockRes, next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });

  it('should allow editor to create content', () => {
    const middleware = requirePermission('content:create');
    middleware(createReqWithRole('editor'), mockRes, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should allow all roles to view analytics', () => {
    const middleware = requirePermission('analytics:view');
    for (const role of ['owner', 'admin', 'editor', 'viewer'] as const) {
      const nextFn = vi.fn();
      middleware(createReqWithRole(role), mockRes, nextFn);
      expect(nextFn).toHaveBeenCalledWith();
    }
  });

  it('should deny editor from inviting users', () => {
    const middleware = requirePermission('users:invite');
    middleware(createReqWithRole('editor'), mockRes, next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });
});
