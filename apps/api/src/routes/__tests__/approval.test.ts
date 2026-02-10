import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTokenForRole, authHeader } from '../../test-utils/route-helpers';

vi.mock('../../services/approval.service', () => ({
  resolveByToken: vi.fn().mockResolvedValue({ id: 'appr-1', status: 'approved' }),
  submitForApproval: vi.fn().mockResolvedValue({ id: 'appr-2' }),
  getApprovalById: vi.fn().mockResolvedValue({ id: 'appr-1' }),
  resolveById: vi.fn().mockResolvedValue({ id: 'appr-1' }),
  processReminders: vi.fn().mockResolvedValue({ sent: 3 }),
}));

vi.mock('../../services/reporting.service', () => ({
  getApprovalQueue: vi.fn().mockResolvedValue([{ id: 'appr-1' }]),
}));

let app: Express;

beforeAll(async () => {
  const mod = await import('../../app');
  app = mod.app;
});

describe('Approval Routes', () => {
  // ─── Public resolve ────────────────────────────────────────
  it('GET /api/approval/resolve/tok1 — 400 missing action', async () => {
    const res = await request(app).get('/api/approval/resolve/tok1');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/approval/resolve/tok1?action=approved — 200 happy path', async () => {
    const res = await request(app)
      .get('/api/approval/resolve/tok1?action=approved');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
  });

  // ─── Protected submit ──────────────────────────────────────
  it('POST /api/approval/submit — 401 unauthenticated', async () => {
    const res = await request(app)
      .post('/api/approval/submit')
      .send({
        entityType: 'content_piece',
        entityId: 'cp-1',
      });

    expect(res.status).toBe(401);
  });

  it('POST /api/approval/submit — 400 validation error', async () => {
    const token = createTokenForRole('editor');
    const res = await request(app)
      .post('/api/approval/submit')
      .set(authHeader(token))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/approval/submit — 201 editor creates submission', async () => {
    const token = createTokenForRole('editor');
    const res = await request(app)
      .post('/api/approval/submit')
      .set(authHeader(token))
      .send({
        entityType: 'content_piece',
        entityId: 'cp-1',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('appr-2');
  });
});
