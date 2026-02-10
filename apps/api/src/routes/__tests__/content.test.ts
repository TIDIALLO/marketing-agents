import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTokenForRole, authHeader } from '../../test-utils/route-helpers';

vi.mock('../../services/content.service', () => ({
  createPillar: vi.fn().mockResolvedValue({ id: 'pil-1', name: 'Growth' }),
  listPillars: vi.fn().mockResolvedValue([{ id: 'pil-1' }]),
  createInput: vi.fn().mockResolvedValue({ id: 'inp-1' }),
  createAudioInput: vi.fn().mockResolvedValue({ id: 'inp-2' }),
  listInputs: vi.fn().mockResolvedValue([]),
  getInputById: vi.fn().mockResolvedValue({ id: 'inp-1' }),
  runAiResearch: vi.fn().mockResolvedValue({ id: 'inp-1' }),
  generateContentPiece: vi.fn().mockResolvedValue({ id: 'cp-1' }),
  listPieces: vi.fn().mockResolvedValue([]),
  getPieceById: vi.fn().mockResolvedValue({ id: 'cp-1' }),
  updatePiece: vi.fn().mockResolvedValue({ id: 'cp-1' }),
  updatePieceStatus: vi.fn().mockResolvedValue({ id: 'cp-1' }),
}));

vi.mock('../../services/publishing.service', () => ({
  adaptToAllPlatforms: vi.fn().mockResolvedValue([]),
  scheduleContent: vi.fn().mockResolvedValue({ id: 'sched-1' }),
  publishScheduledContent: vi.fn().mockResolvedValue([]),
  listSchedules: vi.fn().mockResolvedValue([]),
  updateSchedule: vi.fn().mockResolvedValue({ id: 'sched-1' }),
  publishSingle: vi.fn().mockResolvedValue({ id: 'cp-1' }),
}));

vi.mock('../../services/visual.service', () => ({
  generateVisualFromTemplate: vi.fn().mockResolvedValue({ url: 'img.png' }),
  suggestTemplate: vi.fn().mockResolvedValue({ templateId: 't1', variables: {} }),
  listTemplates: vi.fn().mockReturnValue([]),
}));

vi.mock('../../services/repurpose.service', () => ({
  repurposePiece: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../lib/copy-frameworks', () => ({
  COPY_FRAMEWORKS: [{ id: 'pas', name: 'PAS' }],
}));

let app: Express;

beforeAll(async () => {
  const mod = await import('../../app');
  app = mod.app;
});

describe('Content Routes', () => {
  it('GET /api/content/pillars — 401 unauthenticated', async () => {
    const res = await request(app).get('/api/content/pillars?brandId=b1');
    expect(res.status).toBe(401);
  });

  it('GET /api/content/pillars — 200 viewer lists pillars', async () => {
    const token = createTokenForRole('viewer');
    const res = await request(app)
      .get('/api/content/pillars?brandId=b1')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('POST /api/content/pillars — 403 viewer forbidden to create', async () => {
    const token = createTokenForRole('viewer');
    const res = await request(app)
      .post('/api/content/pillars')
      .set(authHeader(token))
      .send({ brandId: 'b1', name: 'Test' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/content/pillars — 400 validation error', async () => {
    const token = createTokenForRole('editor');
    const res = await request(app)
      .post('/api/content/pillars')
      .set(authHeader(token))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/content/pillars — 201 editor creates pillar', async () => {
    const token = createTokenForRole('editor');
    const res = await request(app)
      .post('/api/content/pillars')
      .set(authHeader(token))
      .send({ brandId: 'b1', name: 'Growth' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Growth');
  });
});
