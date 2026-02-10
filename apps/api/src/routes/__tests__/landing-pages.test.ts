import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestToken, authHeader } from '../../test-utils/route-helpers';

vi.mock('../../services/landing-page.service', () => ({
  listLandingPages: vi.fn().mockResolvedValue([{ id: 'lp1', slug: 'test-slug' }]),
  getLandingPageById: vi.fn().mockResolvedValue({ id: 'lp1', slug: 'test-slug' }),
  createLandingPage: vi.fn().mockResolvedValue({ id: 'lp2', slug: 'new-page' }),
  updateLandingPage: vi.fn().mockResolvedValue({ id: 'lp1' }),
  publishLandingPage: vi.fn().mockResolvedValue({ id: 'lp1', published: true }),
  unpublishLandingPage: vi.fn().mockResolvedValue({ id: 'lp1', published: false }),
  generateLandingPageContent: vi.fn().mockResolvedValue({ html: '<h1>Hi</h1>' }),
  deleteLandingPage: vi.fn().mockResolvedValue(undefined),
  getLandingPageBySlug: vi.fn().mockResolvedValue({ id: 'lp1', slug: 'test-slug', title: 'Test' }),
}));

let app: Express;

beforeAll(async () => {
  const mod = await import('../../app');
  app = mod.app;
});

describe('Landing Page Routes', () => {
  it('GET /api/landing-pages — 401 unauthenticated', async () => {
    const res = await request(app).get('/api/landing-pages');
    expect(res.status).toBe(401);
  });

  it('GET /api/landing-pages — 200 lists pages', async () => {
    const token = createTestToken();
    const res = await request(app)
      .get('/api/landing-pages')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('POST /api/landing-pages — 201 creates page', async () => {
    const token = createTestToken();
    const res = await request(app)
      .post('/api/landing-pages')
      .set(authHeader(token))
      .send({ title: 'New Page', slug: 'new-page', brandId: 'b1' });

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe('new-page');
  });

  it('GET /p/test-slug — 200 public slug route (no auth)', async () => {
    const res = await request(app).get('/p/test-slug');

    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe('test-slug');
  });
});
