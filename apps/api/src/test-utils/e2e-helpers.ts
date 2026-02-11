import supertest from 'supertest';
import { app } from '../app';
import { prisma } from '../lib/prisma';

export { app, prisma };

export const request = supertest(app);

const ADMIN_EMAIL = 'admin@synap6ia.com';
const ADMIN_PASSWORD = 'Admin123!';

export const SEED = {
  userId: 'seed-user-001',
  brandId: 'seed-brand-001',
  productId: 'seed-product-001',
  adminEmail: ADMIN_EMAIL,
} as const;

/**
 * Login as the seed admin user and return access token + cookies.
 */
export async function loginAsAdmin(): Promise<{ token: string; cookies: string[] }> {
  const res = await request
    .post('/api/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    .expect(200);

  const token = res.body.data.accessToken;
  const cookies = res.headers['set-cookie'] as unknown as string[];
  return { token, cookies };
}

/**
 * Return Authorization header for authenticated requests.
 */
export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Clean up all test data created by E2E tests (prefixed with `e2e-`).
 */
export async function cleanupTestData() {
  // Order matters: delete dependent records first
  await prisma.leadInteraction.deleteMany({
    where: { lead: { email: { startsWith: 'e2e-' } } },
  });
  await prisma.calendarBooking.deleteMany({
    where: { lead: { email: { startsWith: 'e2e-' } } },
  });
  await prisma.leadSequenceEnrollment.deleteMany({
    where: { lead: { email: { startsWith: 'e2e-' } } },
  });
  await prisma.lead.deleteMany({
    where: { email: { startsWith: 'e2e-' } },
  });
  await prisma.landingPage.deleteMany({
    where: { slug: { startsWith: 'e2e-' } },
  });
  await prisma.product.deleteMany({
    where: { slug: { startsWith: 'e2e-' } },
  });
  await prisma.passwordResetToken.deleteMany({
    where: { user: { email: { startsWith: 'e2e-' } } },
  });
  await prisma.platformUser.deleteMany({
    where: { email: { startsWith: 'e2e-' } },
  });
}
