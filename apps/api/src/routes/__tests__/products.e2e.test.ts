import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, prisma, loginAsAdmin, authHeader, cleanupTestData, SEED } from '../../test-utils/e2e-helpers';

describe('Products E2E Flow', () => {
  let token: string;
  let createdProductId: string;

  beforeAll(async () => {
    const auth = await loginAsAdmin();
    token = auth.token;
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // --- List seed products ---

  it('should list products including seed data', async () => {
    const res = await request
      .get('/api/products')
      .set(authHeader(token))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const seedProduct = res.body.data.find((p: any) => p.id === SEED.productId);
    expect(seedProduct).toBeDefined();
    expect(seedProduct.name).toBe('SOC Autopilot Hub');
    expect(seedProduct.slug).toBe('soc-autopilot-hub');
    expect(seedProduct.brand.name).toBe('Synap6ia');
  });

  // --- Get seed product by ID ---

  it('should get product by ID with relations', async () => {
    const res = await request
      .get(`/api/products/${SEED.productId}`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(SEED.productId);
    expect(res.body.data.name).toBe('SOC Autopilot Hub');
    expect(res.body.data.pricing).toBeDefined();
    expect(res.body.data.features).toBeDefined();
    expect(res.body.data.brand).toBeDefined();
  });

  // --- Create product ---

  it('should create a new product', async () => {
    const res = await request
      .post('/api/products')
      .set(authHeader(token))
      .send({
        brandId: SEED.brandId,
        name: 'E2E Test Product',
        slug: 'e2e-test-product',
        description: 'Product created by E2E test',
        tagline: 'Test tagline',
        ctaText: 'Get Started',
        ctaUrl: 'https://test.synap6ia.com',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('E2E Test Product');
    expect(res.body.data.slug).toBe('e2e-test-product');
    expect(res.body.data.brandId).toBe(SEED.brandId);

    createdProductId = res.body.data.id;

    // Verify in DB
    const dbProduct = await prisma.product.findUnique({
      where: { id: createdProductId },
    });
    expect(dbProduct).not.toBeNull();
    expect(dbProduct!.name).toBe('E2E Test Product');
  });

  // --- Get created product ---

  it('should get the created product by ID', async () => {
    const res = await request
      .get(`/api/products/${createdProductId}`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.data.id).toBe(createdProductId);
    expect(res.body.data.description).toBe('Product created by E2E test');
  });

  // --- Update product ---

  it('should update the product', async () => {
    const res = await request
      .put(`/api/products/${createdProductId}`)
      .set(authHeader(token))
      .send({
        tagline: 'Updated E2E tagline',
        pricing: { plans: [{ name: 'Basic', price: 99 }] },
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.tagline).toBe('Updated E2E tagline');
    expect(res.body.data.pricing).toEqual({ plans: [{ name: 'Basic', price: 99 }] });

    // Verify in DB
    const dbProduct = await prisma.product.findUnique({
      where: { id: createdProductId },
    });
    expect(dbProduct!.tagline).toBe('Updated E2E tagline');
  });

  // --- Delete product ---

  it('should delete the product', async () => {
    const res = await request
      .delete(`/api/products/${createdProductId}`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify removed from DB
    const dbProduct = await prisma.product.findUnique({
      where: { id: createdProductId },
    });
    expect(dbProduct).toBeNull();
  });

  // --- 404 on deleted product ---

  it('should return 404 for deleted product', async () => {
    const res = await request
      .get(`/api/products/${createdProductId}`)
      .set(authHeader(token))
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // --- Reject unauthenticated ---

  it('should reject unauthenticated requests', async () => {
    await request.get('/api/products').expect(401);
  });
});
