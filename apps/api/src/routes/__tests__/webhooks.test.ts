import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

vi.mock('../../services/lead.service', () => ({
  ingestLead: vi.fn().mockResolvedValue({ id: 'lead-1' }),
  scoreLead: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/nurturing.service', () => ({
  analyzeResponse: vi.fn().mockResolvedValue({ sentiment: 'positive' }),
  trackConversion: vi.fn().mockResolvedValue({ converted: true }),
}));

vi.mock('../../services/feedback-loop.service', () => ({
  ingestAdLead: vi.fn().mockResolvedValue({ id: 'ad-lead-1' }),
}));

vi.mock('../../services/monitoring.service', () => ({
  logWorkflowError: vi.fn().mockResolvedValue({ id: 'err-1' }),
}));

vi.mock('../../lib/prisma', () => ({
  prisma: {
    brand: {
      findUnique: vi.fn().mockImplementation(({ where }: any) =>
        where.id === 'brand-1' ? { id: 'brand-1' } : null,
      ),
    },
  },
}));

let app: Express;

beforeAll(async () => {
  process.env.N8N_API_KEY = 'test-n8n-key';
  const mod = await import('../../app');
  app = mod.app;
});

describe('Webhook Routes', () => {
  it('POST /api/webhooks/mkt-301 — 400 on missing email', async () => {
    const res = await request(app)
      .post('/api/webhooks/mkt-301')
      .send({ brandId: 'b1', firstName: 'A', lastName: 'B' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/webhooks/mkt-301 — 201 happy path', async () => {
    const res = await request(app)
      .post('/api/webhooks/mkt-301')
      .send({
        brandId: 'b1',
        firstName: 'Alice',
        lastName: 'Doe',
        email: 'alice@example.com',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.leadId).toBe('lead-1');
  });

  it('POST /api/webhooks/mkt-304 — 200 happy path', async () => {
    const res = await request(app)
      .post('/api/webhooks/mkt-304')
      .send({
        leadId: 'lead-1',
        channel: 'email',
        content: 'I am interested in your product',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/webhooks/mkt-301-ad — 401 without API key', async () => {
    const res = await request(app)
      .post('/api/webhooks/mkt-301-ad')
      .send({
        brandId: 'b1',
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bob@example.com',
      });

    expect(res.status).toBe(401);
  });

  it('POST /api/webhooks/lead-form/bad-id — 404 for missing brand', async () => {
    const res = await request(app)
      .post('/api/webhooks/lead-form/bad-id')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
