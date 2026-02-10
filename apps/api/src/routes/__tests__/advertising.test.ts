import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTokenForRole, authHeader } from '../../test-utils/route-helpers';

vi.mock('../../services/advertising.service', () => ({
  listCampaigns: vi.fn().mockResolvedValue([{ id: 'camp-1', status: 'draft' }]),
  getCampaignById: vi.fn().mockResolvedValue({ id: 'camp-1' }),
  generateCampaignProposal: vi.fn().mockResolvedValue({ id: 'camp-2', status: 'proposed' }),
  submitCampaignForApproval: vi.fn().mockResolvedValue({ id: 'appr-1' }),
  launchCampaign: vi.fn().mockResolvedValue({ id: 'camp-1', status: 'active' }),
  pauseCampaign: vi.fn().mockResolvedValue({ id: 'camp-1', status: 'paused' }),
  runCompetitorResearch: vi.fn().mockResolvedValue([]),
  listCompetitorAds: vi.fn().mockResolvedValue([]),
  collectAdMetrics: vi.fn().mockResolvedValue({ collected: 3 }),
  optimizeCampaigns: vi.fn().mockResolvedValue({ optimized: 2 }),
}));

let app: Express;

beforeAll(async () => {
  const mod = await import('../../app');
  app = mod.app;
});

describe('Advertising Routes', () => {
  it('GET /api/advertising/campaigns — 401 unauthenticated', async () => {
    const res = await request(app).get('/api/advertising/campaigns');
    expect(res.status).toBe(401);
  });

  it('GET /api/advertising/campaigns — 200 viewer lists campaigns', async () => {
    const token = createTokenForRole('viewer');
    const res = await request(app)
      .get('/api/advertising/campaigns')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('POST /api/advertising/campaigns/propose — 400 validation error', async () => {
    const token = createTokenForRole('editor');
    const res = await request(app)
      .post('/api/advertising/campaigns/propose')
      .set(authHeader(token))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/advertising/campaigns/propose — 201 editor creates proposal', async () => {
    const token = createTokenForRole('editor');
    const res = await request(app)
      .post('/api/advertising/campaigns/propose')
      .set(authHeader(token))
      .send({
        brandId: 'b1',
        adAccountId: 'aa1',
        platform: 'facebook',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('proposed');
  });

  it('POST /api/advertising/campaigns/c1/launch — 403 viewer forbidden', async () => {
    const token = createTokenForRole('viewer');
    const res = await request(app)
      .post('/api/advertising/campaigns/c1/launch')
      .set(authHeader(token));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
