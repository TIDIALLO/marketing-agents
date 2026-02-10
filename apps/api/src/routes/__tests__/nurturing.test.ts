import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTokenForRole, authHeader } from '../../test-utils/route-helpers';

vi.mock('../../services/nurturing.service', () => ({
  createSequence: vi.fn().mockResolvedValue({ id: 'seq-1', name: 'Welcome' }),
  listSequences: vi.fn().mockResolvedValue([{ id: 'seq-1' }]),
  getSequenceById: vi.fn().mockResolvedValue({ id: 'seq-1' }),
  updateSequence: vi.fn().mockResolvedValue({ id: 'seq-1' }),
  deleteSequence: vi.fn().mockResolvedValue(undefined),
  enrollLead: vi.fn().mockResolvedValue({ id: 'enr-1' }),
  executeFollowUps: vi.fn().mockResolvedValue({ executed: 3 }),
  analyzeResponse: vi.fn().mockResolvedValue({ sentiment: 'positive' }),
  escalateToHuman: vi.fn().mockResolvedValue({ escalated: true }),
  trackConversion: vi.fn().mockResolvedValue({ converted: true }),
}));

let app: Express;

beforeAll(async () => {
  const mod = await import('../../app');
  app = mod.app;
});

describe('Nurturing Routes', () => {
  it('POST /api/leads/nurturing/sequences — 401 unauthenticated', async () => {
    const res = await request(app)
      .post('/api/leads/nurturing/sequences')
      .send({
        name: 'Welcome',
        steps: [{ order: 0, channel: 'email', delayHours: 24, bodyPrompt: 'Hi' }],
      });

    expect(res.status).toBe(401);
  });

  it('POST /api/leads/nurturing/sequences — 403 viewer forbidden', async () => {
    const token = createTokenForRole('viewer');
    const res = await request(app)
      .post('/api/leads/nurturing/sequences')
      .set(authHeader(token))
      .send({
        name: 'Welcome',
        steps: [{ order: 0, channel: 'email', delayHours: 24, bodyPrompt: 'Hi' }],
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/leads/nurturing/sequences — 400 validation error (empty steps)', async () => {
    const token = createTokenForRole('editor');
    const res = await request(app)
      .post('/api/leads/nurturing/sequences')
      .set(authHeader(token))
      .send({ name: 'Welcome', steps: [] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/leads/nurturing/sequences — 201 editor creates sequence', async () => {
    const token = createTokenForRole('editor');
    const res = await request(app)
      .post('/api/leads/nurturing/sequences')
      .set(authHeader(token))
      .send({
        name: 'Welcome',
        steps: [{ order: 0, channel: 'email', delayHours: 24, bodyPrompt: 'Welcome aboard!' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Welcome');
  });

  it('DELETE /api/leads/nurturing/sequences/s1 — 403 editor forbidden (needs approve)', async () => {
    const token = createTokenForRole('editor');
    const res = await request(app)
      .delete('/api/leads/nurturing/sequences/s1')
      .set(authHeader(token));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
