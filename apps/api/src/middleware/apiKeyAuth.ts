import type { Request, Response, NextFunction } from 'express';

const N8N_API_KEY = process.env.N8N_API_KEY || '';

/**
 * Middleware to verify X-API-Key header for n8n webhook → API calls (Story 10.1)
 * In dev mode (no key configured), all requests pass through.
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  if (!N8N_API_KEY) {
    // Dev mode: no key required
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== N8N_API_KEY) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'API key invalide ou manquante' },
    });
    return;
  }

  next();
}
