import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { correlationIdMiddleware } from './middleware/correlationId';
import { globalErrorHandler } from './middleware/errorHandler';

const app = express();

// 1. Security headers
app.use(helmet());

// 2. CORS
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// 3. Cookie parsing
app.use(cookieParser());

// 4. Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 5. Correlation ID
app.use(correlationIdMiddleware);

// 6. Health check (before auth)
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// 7. Routes will be added in future stories
// app.use('/api/auth', authRoutes);
// app.use('/api', authMiddleware, tenantMiddleware, routes);

// 8. Error handler (always last)
app.use(globalErrorHandler);

export { app };
