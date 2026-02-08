import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { correlationIdMiddleware } from './middleware/correlationId';
import { globalErrorHandler } from './middleware/errorHandler';
import { authLimiter, apiLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/auth';
import { tenantMiddleware } from './middleware/tenant';
import { authRoutes } from './routes/auth';
import { organizationRoutes } from './routes/organizations';
import { brandRoutes } from './routes/brands';
import { socialAccountRoutes } from './routes/social-accounts';
import { settingsRoutes } from './routes/settings';
import { contentRoutes } from './routes/content';

const app = express();

const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];

// 1. Security headers
app.use(helmet());

// 2. CORS — reject unauthorized origins with 403
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS non autorisé'));
  },
  credentials: true,
}));

// 3. Cookie parsing
app.use(cookieParser());

// 4. Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 5. Correlation ID
app.use(correlationIdMiddleware);

// 6. Health check (before auth & rate limiting)
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// 7. Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// 8. Public routes
app.use('/api/auth', authRoutes);

// 9. Protected routes (authMiddleware + tenantMiddleware applied to all)
app.use('/api/organizations', authMiddleware, tenantMiddleware, organizationRoutes);
app.use('/api/brands', authMiddleware, tenantMiddleware, brandRoutes);
app.use('/api/social-accounts', authMiddleware, tenantMiddleware, socialAccountRoutes);
app.use('/api/content', authMiddleware, tenantMiddleware, contentRoutes);
app.use('/api/admin', authMiddleware, tenantMiddleware, settingsRoutes);
app.use('/api/settings', authMiddleware, tenantMiddleware, settingsRoutes);

app.get('/api/me', authMiddleware, tenantMiddleware, (req, res) => {
  res.json({ success: true, data: req.user });
});

// 10. 404 catch-all
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route introuvable' },
  });
});

// 11. Error handler (always last)
app.use(globalErrorHandler);

export { app };
