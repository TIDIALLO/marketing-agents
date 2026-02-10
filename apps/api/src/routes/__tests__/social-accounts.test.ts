import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTokenForRole, authHeader } from '../../test-utils/route-helpers';

vi.mock('../../services/social-account.service', () => ({
  listSocialAccounts: vi.fn().mockResolvedValue([{ id: 'sa1', platform: 'linkedin' }]),
  connectSocialAccount: vi.fn().mockResolvedValue({ id: 'sa2', platform: 'twitter' }),
  disconnectSocialAccount: vi.fn().mockResolvedValue(undefined),
  connectAdAccount: vi.fn().mockResolvedValue({ id: 'ad1' }),
  listAdAccounts: vi.fn().mockResolvedValue([]),
  disconnectAdAccount: vi.fn().mockResolvedValue(undefined),
}));

let app: Express;

beforeAll(async () => {
  const mod = await import('../../app');
  app = mod.app;
});

describe('Social Account Routes', () => {
  it('GET /api/social-accounts — 401 unauthenticated', async () => {
    const res = await request(app).get('/api/social-accounts?brandId=b1');
    expect(res.status).toBe(401);
  });

  it('GET /api/social-accounts — 403 editor forbidden', async () => {
    const token = createTokenForRole('editor');
    const res = await request(app)
      .get('/api/social-accounts?brandId=b1')
      .set(authHeader(token));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/social-accounts — 200 admin lists accounts', async () => {
    const token = createTokenForRole('admin');
    const res = await request(app)
      .get('/api/social-accounts?brandId=b1')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('POST /api/social-accounts — 201 admin creates account', async () => {
    const token = createTokenForRole('admin');
    const res = await request(app)
      .post('/api/social-accounts')
      .set(authHeader(token))
      .send({
        brandId: 'b1',
        platform: 'twitter',
        accessToken: 'tok-123',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.platform).toBe('twitter');
  });
});
