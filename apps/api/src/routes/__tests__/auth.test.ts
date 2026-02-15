import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

vi.mock('../../services/auth.service', () => ({
  register: vi.fn().mockResolvedValue({
    user: { id: 'u-1', email: 'new@test.com', role: 'viewer' },
    accessToken: 'at-123',
    refreshToken: 'rt-123',
  }),
  login: vi.fn().mockResolvedValue({
    user: { id: 'u-1', email: 'admin@mktengine.dev', role: 'owner' },
    accessToken: 'at-456',
    refreshToken: 'rt-456',
  }),
  refresh: vi.fn().mockResolvedValue({
    accessToken: 'at-new',
    refreshToken: 'rt-new',
  }),
  forgotPassword: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  resetPassword: vi.fn().mockResolvedValue(undefined),
}));

let app: Express;

beforeAll(async () => {
  const mod = await import('../../app');
  app = mod.app;
});

describe('Auth Routes', () => {
  // ─── Register ──────────────────────────────────────────────
  it('POST /api/auth/register — 400 on missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/auth/register — 201 happy path', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'new@test.com',
        password: 'securepass1',
        firstName: 'Test',
        lastName: 'User',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBe('at-123');
  });

  // ─── Login ─────────────────────────────────────────────────
  it('POST /api/auth/login — 400 on invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-email', password: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/auth/login — 200 happy path with Set-Cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@mktengine.dev', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBe('at-456');
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.startsWith('refreshToken='))).toBe(true);
  });

  // ─── Refresh ───────────────────────────────────────────────
  it('POST /api/auth/refresh — 401 without cookie', async () => {
    const res = await request(app)
      .post('/api/auth/refresh');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // ─── Forgot Password ──────────────────────────────────────
  it('POST /api/auth/forgot-password — always 200', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'anyone@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
