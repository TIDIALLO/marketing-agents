import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestToken, createTokenForRole, authHeader } from '../../test-utils/route-helpers';

vi.mock('../../services/agent-bus.service', () => ({
  listMessages: vi.fn().mockResolvedValue([]),
  getMessageStats: vi.fn().mockResolvedValue({ total: 0 }),
  consumeMessage: vi.fn().mockResolvedValue({ id: 'm1' }),
  processDLQ: vi.fn().mockResolvedValue({ processed: 0 }),
}));

vi.mock('../../services/oauth-refresh.service', () => ({
  refreshExpiringTokens: vi.fn().mockResolvedValue({ refreshed: 1 }),
}));

vi.mock('../../services/feedback-loop.service', () => ({
  amplifyWinningContent: vi.fn().mockResolvedValue({ amplified: true }),
  analyzeConversionPatterns: vi.fn().mockResolvedValue({}),
  runLearningLoop: vi.fn().mockResolvedValue({}),
  extractAdCreativeInsights: vi.fn().mockResolvedValue({}),
  analyzeObjectionsAndCreateBriefs: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../services/monitoring.service', () => ({
  getSystemHealth: vi.fn().mockResolvedValue({ status: 'healthy', services: {} }),
  logWorkflowError: vi.fn().mockResolvedValue({ id: 'err-1' }),
  listWorkflowErrors: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/signal-crossref.service', () => ({
  runSignalCrossReference: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../services/agent-orchestrator.service', () => ({
  getAgentStats: vi.fn().mockResolvedValue({ agents: [] }),
}));

vi.mock('../../services/trend-detection.service', () => ({
  analyzeHashtagPerformance: vi.fn().mockResolvedValue([]),
  detectRisingTopics: vi.fn().mockResolvedValue([]),
  detectContentFatigue: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../services/ab-testing.service', () => ({
  createTest: vi.fn().mockResolvedValue({ id: 'ab-1' }),
  listTests: vi.fn().mockResolvedValue([]),
  determineWinner: vi.fn().mockResolvedValue({ winner: 'A' }),
  evaluateAllRunningTests: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/compound-learning.service', () => ({
  analyzeFrameworkPerformance: vi.fn().mockResolvedValue({}),
  analyzePostingTimes: vi.fn().mockResolvedValue({}),
  autoUpdateBrandVoice: vi.fn().mockResolvedValue({}),
  trackPromptEffectiveness: vi.fn().mockResolvedValue({}),
  runCompoundLearningCycle: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../lib/prisma', () => ({
  prisma: {
    brand: {
      findFirst: vi.fn().mockResolvedValue({ id: 'b1' }),
      findUnique: vi.fn().mockResolvedValue({ id: 'b1', name: 'Test' }),
    },
  },
}));

let app: Express;

beforeAll(async () => {
  const mod = await import('../../app');
  app = mod.app;
});

describe('System Routes', () => {
  it('GET /api/system/health — 401 unauthenticated', async () => {
    const res = await request(app).get('/api/system/health');
    expect(res.status).toBe(401);
  });

  it('GET /api/system/health — 200 viewer accesses health', async () => {
    const token = createTokenForRole('viewer');
    const res = await request(app)
      .get('/api/system/health')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('healthy');
  });

  it('POST /api/system/oauth/refresh — 403 viewer forbidden', async () => {
    const token = createTokenForRole('viewer');
    const res = await request(app)
      .post('/api/system/oauth/refresh')
      .set(authHeader(token));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/system/ab-tests — 400 validation error', async () => {
    const token = createTestToken(); // owner
    const res = await request(app)
      .post('/api/system/ab-tests')
      .set(authHeader(token))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/system/ab-tests — 201 owner creates ab-test', async () => {
    const token = createTestToken(); // owner
    const res = await request(app)
      .post('/api/system/ab-tests')
      .set(authHeader(token))
      .send({
        name: 'Test A/B',
        entityType: 'content_piece',
        controlId: 'cp-1',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('ab-1');
  });
});
