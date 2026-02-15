import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, prisma, cleanupTestData } from '../../test-utils/e2e-helpers';

describe('Auth E2E Flow', () => {
  const testUser = {
    email: 'e2e-auth@test.mktengine.dev',
    password: 'E2ePassword123!',
    firstName: 'E2E',
    lastName: 'AuthTest',
  };

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // --- Register ---

  it('should register a new user', async () => {
    const res = await request
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.firstName).toBe(testUser.firstName);
    expect(res.body.data.user.role).toBe('owner');
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();

    // Verify user exists in DB
    const dbUser = await prisma.platformUser.findUnique({
      where: { email: testUser.email },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.email).toBe(testUser.email);
    expect(dbUser!.refreshToken).not.toBeNull();
  });

  it('should reject duplicate registration', async () => {
    const res = await request
      .post('/api/auth/register')
      .send(testUser)
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  // --- Login ---

  let accessToken: string;
  let refreshCookies: string[];

  it('should login with correct credentials', async () => {
    const res = await request
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();

    accessToken = res.body.data.accessToken;
    refreshCookies = res.headers['set-cookie'] as unknown as string[];
  });

  it('should reject login with wrong password', async () => {
    const res = await request
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword123!' })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // --- Access protected route ---

  it('should access /api/me with valid token', async () => {
    const res = await request
      .get('/api/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email);
  });

  it('should reject /api/me without token', async () => {
    await request.get('/api/me').expect(401);
  });

  // --- Refresh ---

  it('should refresh access token via cookie', async () => {
    const res = await request
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookies)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(typeof res.body.data.accessToken).toBe('string');

    // Update cookies for subsequent requests (token rotation)
    refreshCookies = res.headers['set-cookie'] as unknown as string[];
  });

  it('should reject refresh without cookie', async () => {
    await request.post('/api/auth/refresh').expect(401);
  });

  // --- Logout ---

  it('should logout and clear refresh token', async () => {
    const res = await request
      .post('/api/auth/logout')
      .set('Cookie', refreshCookies)
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify refresh token is nulled in DB
    const dbUser = await prisma.platformUser.findUnique({
      where: { email: testUser.email },
    });
    expect(dbUser!.refreshToken).toBeNull();
  });

  it('should reject refresh after logout', async () => {
    const res = await request
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookies)
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});
