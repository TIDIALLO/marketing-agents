import rateLimit from 'express-rate-limit';

// Auth routes: 30 requests per 15 minutes (login + refresh + register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Trop de requêtes, veuillez réessayer plus tard',
    },
  },
});

// General API routes: 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Trop de requêtes, veuillez réessayer plus tard',
    },
  },
});
