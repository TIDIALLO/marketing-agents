import { describe, it, expect } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../jwt';
import type { JwtPayload } from '@synap6ia/shared';

const mockPayload: JwtPayload = {
  userId: 'user-123',
  tenantId: 'tenant-456',
  role: 'admin',
  email: 'test@synap6ia.com',
};

describe('JWT', () => {
  describe('generateAccessToken / verifyAccessToken', () => {
    it('should generate and verify a valid access token', () => {
      const token = generateAccessToken(mockPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.tenantId).toBe(mockPayload.tenantId);
      expect(decoded.role).toBe(mockPayload.role);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it('should throw on invalid access token', () => {
      expect(() => verifyAccessToken('invalid.token.here')).toThrow();
    });

    it('should throw on tampered access token', () => {
      const token = generateAccessToken(mockPayload);
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyAccessToken(tampered)).toThrow();
    });
  });

  describe('generateRefreshToken / verifyRefreshToken', () => {
    it('should generate and verify a valid refresh token', () => {
      const token = generateRefreshToken('user-123');
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe('user-123');
    });

    it('should throw on invalid refresh token', () => {
      expect(() => verifyRefreshToken('invalid.token.here')).toThrow();
    });

    it('should not verify access token as refresh token', () => {
      const accessToken = generateAccessToken(mockPayload);
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });

    it('should not verify refresh token as access token', () => {
      const refreshToken = generateRefreshToken('user-123');
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });
});
