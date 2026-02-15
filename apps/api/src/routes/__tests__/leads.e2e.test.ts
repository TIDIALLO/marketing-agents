import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, prisma, loginAsAdmin, authHeader, cleanupTestData, SEED } from '../../test-utils/e2e-helpers';

describe('Leads E2E Flow', () => {
  let token: string;
  let createdLeadId: string;

  beforeAll(async () => {
    const auth = await loginAsAdmin();
    token = auth.token;
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // --- Public lead capture via webhook ---

  it('should capture a lead via POST /api/webhooks/mkt-301', async () => {
    const res = await request
      .post('/api/webhooks/mkt-301')
      .send({
        brandId: SEED.brandId,
        firstName: 'E2E',
        lastName: 'LeadTest',
        email: 'e2e-lead@test.mktengine.dev',
        company: 'E2E Corp',
        source: 'form',
        gdprConsent: true,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.leadId).toBeDefined();

    createdLeadId = res.body.data.leadId;

    // Verify in DB
    const dbLead = await prisma.lead.findUnique({
      where: { id: createdLeadId },
    });
    expect(dbLead).not.toBeNull();
    expect(dbLead!.email).toBe('e2e-lead@test.mktengine.dev');
    expect(dbLead!.firstName).toBe('E2E');
    expect(dbLead!.company).toBe('E2E Corp');
    expect(dbLead!.brandId).toBe(SEED.brandId);
    expect(dbLead!.gdprConsent).toBe(true);
  });

  // --- Deduplication ---

  it('should deduplicate lead on second ingestion with same email', async () => {
    const res = await request
      .post('/api/webhooks/mkt-301')
      .send({
        brandId: SEED.brandId,
        firstName: 'E2E',
        lastName: 'LeadUpdated',
        email: 'e2e-lead@test.mktengine.dev',
        company: 'E2E Corp Updated',
        source: 'ad',
        gdprConsent: true,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    // Should return the same lead ID (dedup)
    expect(res.body.data.leadId).toBe(createdLeadId);

    // Verify merged data in DB
    const dbLead = await prisma.lead.findUnique({
      where: { id: createdLeadId },
    });
    expect(dbLead!.company).toBe('E2E Corp Updated');
    // Source upgraded from form to ad
    expect(dbLead!.source).toBe('ad');
  });

  // --- Public lead form capture ---

  it('should capture a lead via public form POST /api/webhooks/lead-form/:brandId', async () => {
    const res = await request
      .post(`/api/webhooks/lead-form/${SEED.brandId}`)
      .send({
        firstName: 'E2E',
        lastName: 'FormLead',
        email: 'e2e-formlead@test.mktengine.dev',
        company: 'E2E Form Corp',
        gdprConsent: true,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('Merci !');

    // Verify in DB
    const dbLead = await prisma.lead.findFirst({
      where: { email: 'e2e-formlead@test.mktengine.dev' },
    });
    expect(dbLead).not.toBeNull();
    expect(dbLead!.source).toBe('form');
  });

  // --- List leads (authenticated) ---

  it('should list leads including the created one', async () => {
    const res = await request
      .get('/api/leads')
      .set(authHeader(token))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const e2eLead = res.body.data.find((l: any) => l.id === createdLeadId);
    expect(e2eLead).toBeDefined();
    expect(e2eLead.email).toBe('e2e-lead@test.mktengine.dev');
  });

  // --- Filter leads by status ---

  it('should filter leads by status', async () => {
    const res = await request
      .get('/api/leads?status=qualified')
      .set(authHeader(token))
      .expect(200);

    expect(res.body.success).toBe(true);
    // All returned leads should have status=qualified
    for (const lead of res.body.data) {
      expect(lead.status).toBe('qualified');
    }
  });

  // --- Get lead by ID ---

  it('should get lead detail by ID', async () => {
    const res = await request
      .get(`/api/leads/${createdLeadId}`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdLeadId);
    expect(res.body.data.email).toBe('e2e-lead@test.mktengine.dev');
  });

  // --- Update lead ---

  it('should update lead status and temperature', async () => {
    const res = await request
      .put(`/api/leads/${createdLeadId}`)
      .set(authHeader(token))
      .send({ status: 'qualified', temperature: 'hot' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('qualified');
    expect(res.body.data.temperature).toBe('hot');

    // Verify in DB
    const dbLead = await prisma.lead.findUnique({
      where: { id: createdLeadId },
    });
    expect(dbLead!.status).toBe('qualified');
    expect(dbLead!.temperature).toBe('hot');
  });

  // --- Pipeline funnel ---

  it('should return pipeline funnel data', async () => {
    const res = await request
      .get('/api/leads/pipeline')
      .set(authHeader(token))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.byTemperature)).toBe(true);
    expect(Array.isArray(res.body.data.byStatus)).toBe(true);
    expect(Array.isArray(res.body.data.bySource)).toBe(true);
  });

  // --- Reject unauthenticated ---

  it('should reject unauthenticated lead list', async () => {
    await request.get('/api/leads').expect(401);
  });
});
