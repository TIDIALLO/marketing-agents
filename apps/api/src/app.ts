import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { correlationIdMiddleware } from './middleware/correlationId';
import { globalErrorHandler } from './middleware/errorHandler';
import { authLimiter, apiLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { brandRoutes } from './routes/brands';
import { socialAccountRoutes } from './routes/social-accounts';
import { settingsRoutes } from './routes/settings';
import { contentRoutes } from './routes/content';
import { approvalPublicRoutes, approvalRoutes } from './routes/approval';
import { analyticsRoutes } from './routes/analytics';
import { leadRoutes } from './routes/leads';
import { webhookRoutes } from './routes/webhooks';
import { nurturingRoutes } from './routes/nurturing';
import { advertisingRoutes } from './routes/advertising';
import { systemRoutes } from './routes/system';
import { oauthRoutes } from './routes/oauth';
import { embedRoutes } from './routes/embed';
import { productRoutes } from './routes/products';
import { landingPageRoutes, landingPagePublicRoutes } from './routes/landing-pages';
import { emailMarketingRoutes, emailTrackingRoutes } from './routes/email-marketing';
import { n8nInternalRoutes } from './routes/n8n-internal';

const app = express();

const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3100'];
const isDev = process.env.NODE_ENV !== 'production';

// 1. Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// 2. CORS — reject unauthorized origins with 403
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server, proxied)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In dev, allow any origin for easier local/remote testing
    if (isDev) return callback(null, true);
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
app.use('/api/approval', approvalPublicRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/embed', embedRoutes);
app.use('/p', landingPagePublicRoutes);
app.use('/api/email/track', emailTrackingRoutes);

// 9. n8n internal routes (API key auth)
app.use('/api/internal', n8nInternalRoutes);

// 10. Protected routes (authMiddleware applied to all)
app.use('/api/brands', authMiddleware, brandRoutes);
app.use('/api/social-accounts', authMiddleware, socialAccountRoutes);
app.use('/api/content', authMiddleware, contentRoutes);
app.use('/api/approval', authMiddleware, approvalRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/leads', authMiddleware, leadRoutes);
app.use('/api/leads/nurturing', authMiddleware, nurturingRoutes);
app.use('/api/advertising', authMiddleware, advertisingRoutes);
app.use('/api/system', authMiddleware, systemRoutes);
app.use('/api/admin', authMiddleware, settingsRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/landing-pages', authMiddleware, landingPageRoutes);
app.use('/api/email-marketing', authMiddleware, emailMarketingRoutes);

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ success: true, data: req.user });
});

// 11. 404 catch-all
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route introuvable' },
  });
});

// 12. Error handler (always last)
app.use(globalErrorHandler);

export { app };
