import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestToken, createTokenForRole, authHeader } from '../../test-utils/route-helpers';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    platformUser: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'owner',
        notificationPreferences: { slack: true, email: true, whatsapp: false },
      }),
      update: vi.fn().mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        firstName: 'Amadou',
        lastName: 'Diallo',
        role: 'owner',
        notificationPreferences: { slack: false, email: true, whatsapp: true },
      }),
    },
  },
}));

let app: Express;

beforeAll(async () => {
  const mod = await import('../../app');
  app = mod.app;
});

describe('Settings Routes', () => {
  // ─── Profile ────────────────────────────────────────────
  it('PUT /api/settings/profile — 401 unauthenticated', async () => {
    const res = await request(app).put('/api/settings/profile');
    expect(res.status).toBe(401);
  });

  it('PUT /api/settings/profile — 200 updates profile', async () => {
    const token = createTestToken();
    const res = await request(app)
      .put('/api/settings/profile')
      .set(authHeader(token))
      .send({ firstName: 'Amadou', lastName: 'Diallo' });

    expect(res.status).toBe(200);
    expect(res.body.data.firstName).toBe('Amadou');
  });

  // ─── Notifications ─────────────────────────────────────
  it('GET /api/settings/notifications — 401 unauthenticated', async () => {
    const res = await request(app).get('/api/settings/notifications');
    expect(res.status).toBe(401);
  });

  it('GET /api/settings/notifications — 200 returns prefs', async () => {
    const token = createTokenForRole('viewer');
    const res = await request(app)
      .get('/api/settings/notifications')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ slack: true, email: true, whatsapp: false });
  });

  it('PUT /api/settings/notifications — 400 validation error', async () => {
    const token = createTestToken();
    const res = await request(app)
      .put('/api/settings/notifications')
      .set(authHeader(token))
      .send({ slack: 'not-boolean' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PUT /api/settings/notifications — 200 updates prefs', async () => {
    const token = createTestToken();
    const res = await request(app)
      .put('/api/settings/notifications')
      .set(authHeader(token))
      .send({ slack: false, email: true, whatsapp: true });

    expect(res.status).toBe(200);
    expect(res.body.data.whatsapp).toBe(true);
  });
});
