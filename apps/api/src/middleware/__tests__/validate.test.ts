import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../validate';
import { AppError } from '../../lib/errors';

function createReqWithBody(body: unknown): Request {
  return { body } as Request;
}

const mockRes = {} as Response;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

describe('validate', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('should pass valid data and set parsed body', () => {
    const body = { email: 'test@mktengine.dev', password: 'password123' };
    const req = createReqWithBody(body);
    const middleware = validate(loginSchema);

    middleware(req, mockRes, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual(body);
  });

  it('should reject invalid email', () => {
    const req = createReqWithBody({ email: 'not-an-email', password: 'password123' });
    const middleware = validate(loginSchema);

    middleware(req, mockRes, next);

    expect(next).toHaveBeenCalledOnce();
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toBeDefined();
    expect(Array.isArray(err.details)).toBe(true);
  });

  it('should reject short password', () => {
    const req = createReqWithBody({ email: 'test@mktengine.dev', password: 'short' });
    const middleware = validate(loginSchema);

    middleware(req, mockRes, next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    const details = err.details as Array<{ field: string; message: string }>;
    expect(details[0]!.field).toBe('password');
  });

  it('should reject missing fields', () => {
    const req = createReqWithBody({});
    const middleware = validate(loginSchema);

    middleware(req, mockRes, next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    const details = err.details as Array<{ field: string }>;
    expect(details.length).toBeGreaterThanOrEqual(2);
  });

  it('should strip extra fields with strict schema', () => {
    const strictSchema = z.object({ name: z.string() }).strict();
    const req = createReqWithBody({ name: 'test', extra: 'field' });
    const middleware = validate(strictSchema);

    middleware(req, mockRes, next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
  });
});
