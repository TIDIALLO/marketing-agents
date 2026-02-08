import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // CORS rejection → 403
  const isCorsError = err.message === 'CORS non autorisé';
  const statusCode = isCorsError ? 403 : err instanceof AppError ? err.statusCode : 500;
  const code = isCorsError ? 'FORBIDDEN' : err instanceof AppError ? err.code : 'INTERNAL_ERROR';

  console.error(JSON.stringify({
    correlationId: req.correlationId,
    statusCode,
    code,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  }));

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: err.message,
      details: err instanceof AppError ? err.details : undefined,
    },
  });
}
