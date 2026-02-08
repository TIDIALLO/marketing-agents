import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../asyncHandler';

const mockReq = {} as Request;
const mockRes = {} as Response;

describe('asyncHandler', () => {
  it('should call the wrapped function', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(fn);
    const next = vi.fn();

    handler(mockReq, mockRes, next);

    await new Promise((r) => setTimeout(r, 0));
    expect(fn).toHaveBeenCalledWith(mockReq, mockRes, next);
  });

  it('should call next with error when async function rejects', async () => {
    const error = new Error('Async failure');
    const fn = vi.fn().mockRejectedValue(error);
    const handler = asyncHandler(fn);
    const next = vi.fn();

    handler(mockReq, mockRes, next);

    await new Promise((r) => setTimeout(r, 0));
    expect(next).toHaveBeenCalledWith(error);
  });

  it('should not call next when function resolves', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(fn);
    const next = vi.fn();

    handler(mockReq, mockRes, next);

    await new Promise((r) => setTimeout(r, 0));
    expect(next).not.toHaveBeenCalled();
  });
});
