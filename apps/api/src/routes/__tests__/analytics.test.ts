import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestToken, createTokenForRole, authHeader } from '../../test-utils/route-helpers';

vi.mock('../../services/metrics.service', () => ({
  collectMetrics: vi.fn().mockResolvedValue({ collected: 5 }),
  detectWinningContent: vi.fn().mockResolvedValue([]),
  listSignals: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/analytics.service', () => ({
  getDashboardData: vi.fn().mockResolvedValue({ totalPosts: 42 }),
  getTopPosts: vi.fn().mockResolvedValue([{ id: 'cp-1', engagement: 100 }]),
  getTrends: vi.fn().mockResolvedValue([]),
  getPieceMetricsHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/reporting.service', () => ({
  getStreamingKPIs: vi.fn().mockResolvedValue({ kpis: [] }),
  getThisWeekOverview: vi.fn().mockResolvedValue({ highlights: [] }),
  aggregateDailyAnalytics: vi.fn().mockResolvedValue({ aggregated: true }),
  generateWeeklyReport: vi.fn().mockResolvedValue({ report: 'done' }),
  getApprovalQueue: vi.fn().mockResolvedValue([]),
}));

let app: Express;

beforeAll(async () => {
  const mod = await import('../../app');
  app = mod.app;
});

describe('Analytics Routes', () => {
  it('GET /api/analytics/dashboard — 401 unauthenticated', async () => {
    const res = await request(app).get('/api/analytics/dashboard');
    expect(res.status).toBe(401);
  });

  it('GET /api/analytics/dashboard — 200 viewer sees dashboard', async () => {
    const token = createTokenForRole('viewer');
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.totalPosts).toBe(42);
  });

  it('POST /api/analytics/collect-metrics — 403 viewer forbidden', async () => {
    const token = createTokenForRole('viewer');
    const res = await request(app)
      .post('/api/analytics/collect-metrics')
      .set(authHeader(token));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/analytics/collect-metrics — 200 owner triggers', async () => {
    const token = createTestToken(); // owner
    const res = await request(app)
      .post('/api/analytics/collect-metrics')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.collected).toBe(5);
  });

  it('GET /api/analytics/top-posts — 200 returns top posts', async () => {
    const token = createTokenForRole('viewer');
    const res = await request(app)
      .get('/api/analytics/top-posts')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});
