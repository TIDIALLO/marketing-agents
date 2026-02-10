import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestToken, createTokenForRole, authHeader } from '../../test-utils/route-helpers';

vi.mock('../../services/lead.service', () => ({
  ingestLead: vi.fn().mockResolvedValue({ id: 'lead-1', email: 'test@test.com' }),
  listLeads: vi.fn().mockResolvedValue([{ id: 'lead-1' }]),
  getLeadById: vi.fn().mockResolvedValue({ id: 'lead-1' }),
  updateLead: vi.fn().mockResolvedValue({ id: 'lead-1' }),
  scoreLead: vi.fn().mockResolvedValue({ score: 85 }),
  createBookingProposal: vi.fn().mockResolvedValue({ id: 'bk-1' }),
  generateSalesBriefing: vi.fn().mockResolvedValue({ id: 'bk-1' }),
  confirmBooking: vi.fn().mockResolvedValue({ id: 'bk-1' }),
  getPipelineFunnel: vi.fn().mockResolvedValue({ stages: [] }),
}));

let app: Express;

beforeAll(async () => {
  const mod = await import('../../app');
  app = mod.app;
});

describe('Lead Routes', () => {
  it('POST /api/leads — 401 unauthenticated', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ brandId: 'b1', firstName: 'A', lastName: 'B', email: 'a@b.com' });

    expect(res.status).toBe(401);
  });

  it('POST /api/leads — 403 viewer forbidden to create', async () => {
    const token = createTokenForRole('viewer');
    const res = await request(app)
      .post('/api/leads')
      .set(authHeader(token))
      .send({ brandId: 'b1', firstName: 'A', lastName: 'B', email: 'a@b.com' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/leads — 400 validation error (missing brandId)', async () => {
    const token = createTokenForRole('editor');
    const res = await request(app)
      .post('/api/leads')
      .set(authHeader(token))
      .send({ firstName: 'A', lastName: 'B', email: 'a@b.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/leads — 201 editor creates lead', async () => {
    const token = createTokenForRole('editor');
    const res = await request(app)
      .post('/api/leads')
      .set(authHeader(token))
      .send({ brandId: 'b1', firstName: 'Alice', lastName: 'Doe', email: 'alice@test.com' });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('lead-1');
  });

  it('GET /api/leads — 200 viewer lists leads', async () => {
    const token = createTokenForRole('viewer');
    const res = await request(app)
      .get('/api/leads')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});
