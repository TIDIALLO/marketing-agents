import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { globalErrorHandler } from '../errorHandler';
import { AppError } from '../../lib/errors';

function createMockRes() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

function createMockReq(correlationId?: string): Request {
  return { correlationId } as unknown as Request;
}

const mockNext = vi.fn() as NextFunction;

describe('globalErrorHandler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should handle AppError with correct statusCode', () => {
    const err = new AppError(404, 'NOT_FOUND', 'Ressource introuvable');
    const res = createMockRes();

    globalErrorHandler(err, createMockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Ressource introuvable',
        details: undefined,
      },
    });
  });

  it('should handle AppError with details', () => {
    const details = [{ field: 'email', message: 'Email invalide' }];
    const err = new AppError(400, 'VALIDATION_ERROR', 'Données invalides', details);
    const res = createMockRes();

    globalErrorHandler(err, createMockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Données invalides',
        details,
      },
    });
  });

  it('should handle CORS error as 403', () => {
    const err = new Error('CORS non autorisé');
    const res = createMockRes();

    globalErrorHandler(err, createMockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
      }),
    );
  });

  it('should handle generic Error as 500', () => {
    const err = new Error('Something went wrong');
    const res = createMockRes();

    globalErrorHandler(err, createMockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong',
        details: undefined,
      },
    });
  });

  it('should log the error with correlationId', () => {
    const err = new AppError(400, 'VALIDATION_ERROR', 'Test');
    const res = createMockRes();

    globalErrorHandler(err, createMockReq('corr-123'), res, mockNext);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('"correlationId":"corr-123"'),
    );
  });
});
