import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    brand: {
      findUnique: vi.fn().mockImplementation(({ where }: any) =>
        where.id === 'brand-1'
          ? { id: 'brand-1', name: 'Test Brand' }
          : null,
      ),
    },
  },
}));

let app: Express;

beforeAll(async () => {
  const mod = await import('../../app');
  app = mod.app;
});

describe('Embed Routes', () => {
  it('GET /embed/form/brand-1 — 200 with HTML', async () => {
    const res = await request(app).get('/embed/form/brand-1');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('Test Brand');
  });

  it('GET /embed/form/missing — 404 for missing brand', async () => {
    const res = await request(app).get('/embed/form/missing');

    expect(res.status).toBe(404);
    expect(res.text).toContain('introuvable');
  });

  it('GET /embed/form/brand-1 — escapes HTML (XSS prevention)', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.brand.findUnique as any).mockResolvedValueOnce({
      id: 'brand-xss',
      name: '<script>alert("xss")</script>',
    });

    const res = await request(app).get('/embed/form/brand-xss');

    expect(res.status).toBe(200);
    // The brand name should be escaped in the title and heading
    expect(res.text).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    // The raw unescaped brand name must NOT appear in HTML attributes/text
    expect(res.text).not.toContain('Contact — <script>');
    expect(res.text).not.toContain('Contactez <script>');
  });
});
