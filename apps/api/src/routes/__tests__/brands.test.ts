import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestToken, createTokenForRole, authHeader } from '../../test-utils/route-helpers';

vi.mock('../../services/brand.service', () => ({
  listBrands: vi.fn().mockResolvedValue([{ id: 'b1', name: 'Synap6ia' }]),
  createBrand: vi.fn().mockResolvedValue({ id: 'b2', name: 'New Brand' }),
  getBrandById: vi.fn().mockResolvedValue({ id: 'b1' }),
  updateBrand: vi.fn().mockResolvedValue({ id: 'b1' }),
  deleteBrand: vi.fn().mockResolvedValue(undefined),
  updateBrandVoice: vi.fn().mockResolvedValue({ id: 'b1' }),
  createProduct: vi.fn().mockResolvedValue({ id: 'p1' }),
  listProducts: vi.fn().mockResolvedValue([]),
  updateProduct: vi.fn().mockResolvedValue({ id: 'p1' }),
  deleteProduct: vi.fn().mockResolvedValue(undefined),
}));

let app: Express;

beforeAll(async () => {
  const mod = await import('../../app');
  app = mod.app;
});

describe('Brand Routes', () => {
  it('GET /api/brands — 401 unauthenticated', async () => {
    const res = await request(app).get('/api/brands');
    expect(res.status).toBe(401);
  });

  it('GET /api/brands — 200 viewer can list', async () => {
    const token = createTokenForRole('viewer');
    const res = await request(app)
      .get('/api/brands')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('POST /api/brands — 403 viewer forbidden to create', async () => {
    const token = createTokenForRole('viewer');
    const res = await request(app)
      .post('/api/brands')
      .set(authHeader(token))
      .send({ name: 'Forbidden' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/brands — 400 validation error (empty body)', async () => {
    const token = createTestToken(); // owner
    const res = await request(app)
      .post('/api/brands')
      .set(authHeader(token))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/brands — 201 owner creates brand', async () => {
    const token = createTestToken(); // owner
    const res = await request(app)
      .post('/api/brands')
      .set(authHeader(token))
      .send({ name: 'New Brand' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('New Brand');
  });
});
