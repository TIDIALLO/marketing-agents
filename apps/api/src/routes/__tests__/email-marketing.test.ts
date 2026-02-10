import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestToken, authHeader } from '../../test-utils/route-helpers';

vi.mock('../../services/email-marketing.service', () => ({
  listTemplates: vi.fn().mockResolvedValue([{ id: 't1', name: 'Welcome' }]),
  getTemplateById: vi.fn().mockResolvedValue({ id: 't1' }),
  createTemplate: vi.fn().mockResolvedValue({ id: 't2' }),
  updateTemplate: vi.fn().mockResolvedValue({ id: 't1' }),
  deleteTemplate: vi.fn().mockResolvedValue(undefined),
  listCampaigns: vi.fn().mockResolvedValue([]),
  getCampaignById: vi.fn().mockResolvedValue({ id: 'c1' }),
  createCampaign: vi.fn().mockResolvedValue({ id: 'c2' }),
  updateCampaign: vi.fn().mockResolvedValue({ id: 'c1' }),
  deleteCampaign: vi.fn().mockResolvedValue(undefined),
  sendCampaign: vi.fn().mockResolvedValue({ sent: 10 }),
  generateEmailContent: vi.fn().mockResolvedValue({ subject: 'Hi' }),
  trackOpen: vi.fn().mockResolvedValue(undefined),
  trackClick: vi.fn().mockResolvedValue(undefined),
}));

let app: Express;

beforeAll(async () => {
  const mod = await import('../../app');
  app = mod.app;
});

describe('Email Marketing Routes', () => {
  it('GET /api/email-marketing/templates — 401 unauthenticated', async () => {
    const res = await request(app).get('/api/email-marketing/templates');
    expect(res.status).toBe(401);
  });

  it('GET /api/email-marketing/templates — 200 authenticated', async () => {
    const token = createTestToken();
    const res = await request(app)
      .get('/api/email-marketing/templates')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /api/email/track/open/c1/l1 — 200 returns 1x1 gif', async () => {
    const res = await request(app).get('/api/email/track/open/c1/l1');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/gif');
  });

  it('GET /api/email/track/click/c1/l1 — 302 redirect', async () => {
    const res = await request(app)
      .get('/api/email/track/click/c1/l1?url=https://example.com');

    expect(res.status).toBe(302);
    expect(res.headers['location']).toBe('https://example.com');
  });
});
