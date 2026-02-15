import { generateAccessToken } from '../lib/jwt';
import type { Role, JwtPayload } from '@mktengine/shared';

export function createTestToken(overrides?: Partial<JwtPayload>): string {
  return generateAccessToken({
    userId: 'user-1',
    role: 'owner',
    email: 'admin@mktengine.dev',
    ...overrides,
  });
}

export function createTokenForRole(role: Role): string {
  return createTestToken({ role });
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
