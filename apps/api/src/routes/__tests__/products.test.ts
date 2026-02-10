import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestToken, authHeader } from '../../test-utils/route-helpers';

vi.mock('../../services/product.service', () => ({
  listProducts: vi.fn().mockResolvedValue([{ id: 'p1', name: 'SOC Hub' }]),
  getProductById: vi.fn().mockResolvedValue({ id: 'p1' }),
  createProduct: vi.fn().mockResolvedValue({ id: 'p2', name: 'New Product' }),
  updateProduct: vi.fn().mockResolvedValue({ id: 'p1' }),
  deleteProduct: vi.fn().mockResolvedValue(undefined),
  generateProductContent: vi.fn().mockResolvedValue({ headline: 'Great product' }),
}));

let app: Express;

beforeAll(async () => {
  const mod = await import('../../app');
  app = mod.app;
});

describe('Product Routes', () => {
  it('GET /api/products — 401 unauthenticated', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });

  it('GET /api/products — 200 lists products', async () => {
    const token = createTestToken();
    const res = await request(app)
      .get('/api/products')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it('POST /api/products — 201 creates product', async () => {
    const token = createTestToken();
    const res = await request(app)
      .post('/api/products')
      .set(authHeader(token))
      .send({ name: 'New Product', brandId: 'b1' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('New Product');
  });

  it('POST /api/products/p1/generate-content — 200', async () => {
    const token = createTestToken();
    const res = await request(app)
      .post('/api/products/p1/generate-content')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.headline).toBe('Great product');
  });
});
