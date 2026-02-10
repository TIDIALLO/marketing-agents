import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// Mock all services used by n8n-internal routes (dynamic imports)
vi.mock('../../services/content.service', () => ({
  runAiResearch: vi.fn().mockResolvedValue({ id: 'inp-1', status: 'researched' }),
  generateContentPiece: vi.fn().mockResolvedValue({ id: 'cp-1' }),
}));

vi.mock('../../services/approval.service', () => ({
  submitForApproval: vi.fn().mockResolvedValue({ id: 'appr-1' }),
  processReminders: vi.fn().mockResolvedValue({ sent: 0 }),
}));

vi.mock('../../services/publishing.service', () => ({
  publishScheduledContent: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/metrics.service', () => ({
  collectMetrics: vi.fn().mockResolvedValue({ collected: 10 }),
  detectWinningContent: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/lead.service', () => ({
  scoreLead: vi.fn().mockResolvedValue({ score: 85 }),
  createBookingProposal: vi.fn().mockResolvedValue({ id: 'bk-1' }),
}));

vi.mock('../../services/nurturing.service', () => ({
  executeFollowUps: vi.fn().mockResolvedValue({ executed: 2 }),
}));

vi.mock('../../services/reporting.service', () => ({
  aggregateDailyAnalytics: vi.fn().mockResolvedValue({ aggregated: true }),
  generateWeeklyReport: vi.fn().mockResolvedValue({ report: 'ok' }),
}));

vi.mock('../../services/feedback-loop.service', () => ({
  runLearningLoop: vi.fn().mockResolvedValue({ learned: true }),
}));

vi.mock('../../services/oauth-refresh.service', () => ({
  refreshExpiringTokens: vi.fn().mockResolvedValue({ refreshed: 1 }),
}));

vi.mock('../../services/email-marketing.service', () => ({
  sendCampaign: vi.fn().mockResolvedValue({ sent: 5 }),
}));

let app: Express;
const API_KEY = 'test-n8n-api-key';

beforeAll(async () => {
  process.env.N8N_API_KEY = API_KEY;
  const mod = await import('../../app');
  app = mod.app;
});

describe('n8n Internal Routes', () => {
  it('POST /api/internal/content/research/inp-1 — 401 without API key', async () => {
    const res = await request(app)
      .post('/api/internal/content/research/inp-1');

    expect(res.status).toBe(401);
  });

  it('POST /api/internal/content/research/inp-1 — 200 with valid key', async () => {
    const res = await request(app)
      .post('/api/internal/content/research/inp-1')
      .set('x-api-key', API_KEY);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('researched');
  });

  it('POST /api/internal/metrics/collect — 200', async () => {
    const res = await request(app)
      .post('/api/internal/metrics/collect')
      .set('x-api-key', API_KEY);

    expect(res.status).toBe(200);
    expect(res.body.data.collected).toBe(10);
  });

  it('POST /api/internal/leads/score/lead-1 — 200', async () => {
    const res = await request(app)
      .post('/api/internal/leads/score/lead-1')
      .set('x-api-key', API_KEY);

    expect(res.status).toBe(200);
    expect(res.body.data.score).toBe(85);
  });
});
