import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

vi.mock('../../lib/redis', () => ({
  getRedis: vi.fn().mockReturnValue({
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
  }),
}));

vi.mock('../../lib/prisma', () => ({
  prisma: {
    platformUser: {
      findUnique: vi.fn().mockResolvedValue({ id: 'u-1', brands: [{ id: 'b1' }] }),
    },
    socialAccount: {
      upsert: vi.fn().mockResolvedValue({ id: 'sa1' }),
    },
    brand: {
      findUnique: vi.fn().mockResolvedValue({ id: 'b1', name: 'Test' }),
    },
  },
}));

vi.mock('../../lib/encryption', () => ({
  encrypt: vi.fn().mockImplementation((text: string) => `enc:${text}`),
  decrypt: vi.fn().mockImplementation((text: string) => text.replace('enc:', '')),
}));

vi.mock('../../lib/linkedin', () => ({
  getLinkedInAuthUrl: vi.fn().mockReturnValue('https://linkedin.com/auth?state=abc'),
  exchangeLinkedInCode: vi.fn().mockResolvedValue({
    accessToken: 'li-at',
    refreshToken: 'li-rt',
    expiresIn: 3600,
  }),
  getLinkedInProfile: vi.fn().mockResolvedValue({ sub: 'li-123', name: 'Test User' }),
}));

vi.mock('../../lib/twitter', () => ({
  getTwitterAuthUrl: vi.fn().mockReturnValue('https://twitter.com/auth?state=abc'),
  exchangeTwitterCode: vi.fn().mockResolvedValue({
    accessToken: 'tw-at',
    refreshToken: 'tw-rt',
    expiresIn: 7200,
  }),
  getTwitterProfile: vi.fn().mockResolvedValue({ id: 'tw-123', username: 'testuser' }),
  generatePKCE: vi.fn().mockReturnValue({
    codeVerifier: 'verifier-123',
    codeChallenge: 'challenge-123',
  }),
}));

let app: Express;

beforeAll(async () => {
  const mod = await import('../../app');
  app = mod.app;
});

describe('OAuth Routes', () => {
  it('GET /api/oauth/linkedin/authorize — 401 unauthenticated', async () => {
    const res = await request(app).get('/api/oauth/linkedin/authorize');

    // OAuth authorize uses authMiddleware inline, so without token → 401
    expect(res.status).toBe(401);
  });

  it('GET /api/oauth/linkedin/callback?error=denied — 302 redirect on error', async () => {
    const res = await request(app)
      .get('/api/oauth/linkedin/callback?error=access_denied');

    expect(res.status).toBe(302);
    expect(res.headers['location']).toContain('error=linkedin_denied');
  });

  it('GET /api/oauth/twitter/authorize — 401 unauthenticated', async () => {
    const res = await request(app).get('/api/oauth/twitter/authorize');

    expect(res.status).toBe(401);
  });
});
