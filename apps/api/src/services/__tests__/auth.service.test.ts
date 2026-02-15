import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { AppError } from '../../lib/errors';

// ─── Mocks ──────────────────────────────────────────────────────
const mockPrisma = {
  platformUser: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  passwordResetToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock('../../lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../lib/email', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

// Must import after mocks
const authService = await import('../auth.service');

const mockUser = {
  id: 'user-1',
  email: 'test@mktengine.dev',
  passwordHash: await bcrypt.hash('Password123!', 4),
  firstName: 'Test',
  lastName: 'User',
  role: 'owner',
  refreshToken: null,
};

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should throw UNAUTHORIZED for unknown email', async () => {
      mockPrisma.platformUser.findUnique.mockResolvedValue(null);

      await expect(authService.login({ email: 'unknown@test.com', password: 'pass' }))
        .rejects.toThrow(AppError);

      try {
        await authService.login({ email: 'unknown@test.com', password: 'pass' });
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(401);
        expect((err as AppError).code).toBe('UNAUTHORIZED');
      }
    });

    it('should throw UNAUTHORIZED for wrong password', async () => {
      mockPrisma.platformUser.findUnique.mockResolvedValue(mockUser);
      mockPrisma.platformUser.update.mockResolvedValue(mockUser);

      await expect(authService.login({ email: 'test@mktengine.dev', password: 'WrongPassword!' }))
        .rejects.toThrow(AppError);
    });

    it('should return user, accessToken, and refreshToken on success', async () => {
      mockPrisma.platformUser.findUnique.mockResolvedValue(mockUser);
      mockPrisma.platformUser.update.mockResolvedValue(mockUser);

      const result = await authService.login({
        email: 'test@mktengine.dev',
        password: 'Password123!',
      });

      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('test@mktengine.dev');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('refresh', () => {
    it('should throw for invalid refresh token', async () => {
      await expect(authService.refresh('invalid-token')).rejects.toThrow(AppError);
    });
  });

  describe('logout', () => {
    it('should clear refresh token', async () => {
      mockPrisma.platformUser.update.mockResolvedValue(mockUser);

      await authService.logout('user-1');

      expect(mockPrisma.platformUser.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { refreshToken: null },
      });
    });
  });

  describe('forgotPassword', () => {
    it('should silently return if email does not exist (no enumeration)', async () => {
      mockPrisma.platformUser.findUnique.mockResolvedValue(null);

      await expect(authService.forgotPassword('unknown@test.com')).resolves.toBeUndefined();
    });

    it('should create reset token and send email for existing user', async () => {
      mockPrisma.platformUser.findUnique.mockResolvedValue(mockUser);
      mockPrisma.passwordResetToken.create.mockResolvedValue({ id: 'rt-1' });

      await authService.forgotPassword('test@mktengine.dev');

      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledOnce();
      const { sendPasswordResetEmail } = await import('../../lib/email');
      expect(sendPasswordResetEmail).toHaveBeenCalledOnce();
    });
  });

  describe('resetPassword', () => {
    it('should throw for invalid reset token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(authService.resetPassword('bad-token', 'NewPassword123!'))
        .rejects.toThrow(AppError);
    });

    it('should throw for expired reset token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() - 3600_000), // 1h ago
        usedAt: null,
        user: mockUser,
      });

      await expect(authService.resetPassword('some-token', 'NewPassword123!'))
        .rejects.toThrow(AppError);
    });

    it('should throw for already used token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 3600_000),
        usedAt: new Date(),
        user: mockUser,
      });

      await expect(authService.resetPassword('some-token', 'NewPassword123!'))
        .rejects.toThrow(AppError);
    });

    it('should update password and mark token as used for valid token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 3600_000),
        usedAt: null,
        user: mockUser,
      });
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await authService.resetPassword('some-token', 'NewPassword123!');

      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    });
  });
});
