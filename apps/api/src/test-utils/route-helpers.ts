import { generateAccessToken } from '../lib/jwt';
import type { Role, JwtPayload } from '@synap6ia/shared';

export function createTestToken(overrides?: Partial<JwtPayload>): string {
  return generateAccessToken({
    userId: 'user-1',
    role: 'owner',
    email: 'admin@synap6ia.com',
    ...overrides,
  });
}

export function createTokenForRole(role: Role): string {
  return createTestToken({ role });
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
