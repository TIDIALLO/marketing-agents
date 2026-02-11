import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, prisma, loginAsAdmin, authHeader, cleanupTestData, SEED } from '../../test-utils/e2e-helpers';

describe('Landing Pages E2E Flow', () => {
  let token: string;
  let createdPageId: string;
  const testSlug = 'e2e-test-landing-page';

  beforeAll(async () => {
    const auth = await loginAsAdmin();
    token = auth.token;
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // --- Create landing page ---

  it('should create a landing page', async () => {
    const res = await request
      .post('/api/landing-pages')
      .set(authHeader(token))
      .send({
        brandId: SEED.brandId,
        productId: SEED.productId,
        slug: testSlug,
        title: 'E2E Test Landing Page',
        heroTitle: 'Secure Your Business Today',
        heroSubtitle: 'SOC automation for SMBs',
        heroCtaText: 'Get a Demo',
        heroCtaUrl: 'https://test.synap6ia.com/demo',
        seoTitle: 'E2E Test - SOC Autopilot',
        seoDescription: 'E2E test landing page for SOC Autopilot Hub',
        sections: [
          { type: 'features', title: 'Features', items: [{ title: 'Detection', description: '24/7 monitoring' }] },
          { type: 'cta', title: 'Ready?', content: 'Start now' },
        ],
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe(testSlug);
    expect(res.body.data.title).toBe('E2E Test Landing Page');
    expect(res.body.data.brandId).toBe(SEED.brandId);
    expect(res.body.data.productId).toBe(SEED.productId);

    createdPageId = res.body.data.id;

    // Verify in DB
    const dbPage = await prisma.landingPage.findUnique({
      where: { id: createdPageId },
    });
    expect(dbPage).not.toBeNull();
    expect(dbPage!.heroTitle).toBe('Secure Your Business Today');
    expect(dbPage!.isPublished).toBe(false);
  });

  // --- List landing pages ---

  it('should list landing pages', async () => {
    const res = await request
      .get('/api/landing-pages')
      .set(authHeader(token))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const e2ePage = res.body.data.find((p: any) => p.id === createdPageId);
    expect(e2ePage).toBeDefined();
    expect(e2ePage.brand.name).toBe('Synap6ia');
    expect(e2ePage.product.name).toBe('SOC Autopilot Hub');
  });

  // --- Get by ID ---

  it('should get landing page by ID', async () => {
    const res = await request
      .get(`/api/landing-pages/${createdPageId}`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.data.id).toBe(createdPageId);
    expect(res.body.data.sections).toHaveLength(2);
  });

  // --- Public route should 404 when unpublished ---

  it('should return 404 on public route for unpublished page', async () => {
    const res = await request
      .get(`/p/${testSlug}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  // --- Publish ---

  it('should publish the landing page', async () => {
    const res = await request
      .post(`/api/landing-pages/${createdPageId}/publish`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isPublished).toBe(true);

    // Verify in DB
    const dbPage = await prisma.landingPage.findUnique({
      where: { id: createdPageId },
    });
    expect(dbPage!.isPublished).toBe(true);
  });

  // --- Public route should return data when published ---

  it('should return landing page data on public route when published', async () => {
    const res = await request
      .get(`/p/${testSlug}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe(testSlug);
    expect(res.body.data.heroTitle).toBe('Secure Your Business Today');
    expect(res.body.data.brand.name).toBe('Synap6ia');
    expect(res.body.data.product.name).toBe('SOC Autopilot Hub');
  });

  // --- Update ---

  it('should update the landing page', async () => {
    const res = await request
      .put(`/api/landing-pages/${createdPageId}`)
      .set(authHeader(token))
      .send({
        heroTitle: 'Updated E2E Hero Title',
        seoTitle: 'Updated SEO Title',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.heroTitle).toBe('Updated E2E Hero Title');
    expect(res.body.data.seoTitle).toBe('Updated SEO Title');
  });

  // --- Unpublish ---

  it('should unpublish the landing page', async () => {
    const res = await request
      .post(`/api/landing-pages/${createdPageId}/unpublish`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isPublished).toBe(false);
  });

  it('should return 404 on public route after unpublish', async () => {
    await request.get(`/p/${testSlug}`).expect(404);
  });

  // --- Delete ---

  it('should delete the landing page', async () => {
    const res = await request
      .delete(`/api/landing-pages/${createdPageId}`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify removed from DB
    const dbPage = await prisma.landingPage.findUnique({
      where: { id: createdPageId },
    });
    expect(dbPage).toBeNull();
  });

  // --- Reject unauthenticated ---

  it('should reject unauthenticated requests', async () => {
    await request.get('/api/landing-pages').expect(401);
  });
});
