import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';

// ─── Mocks ──────────────────────────────────────────────────────
const mockPrisma = {
  brand: { findFirst: vi.fn() },
  socialAccount: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  adAccount: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
};

const mockEncrypt = vi.fn().mockImplementation((text: string) => `encrypted:${text}`);

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/encryption', () => ({ encrypt: mockEncrypt }));

const socialAccountService = await import('../social-account.service');

const mockBrand = { id: 'brand-1', name: 'MarketingEngine' };
const mockAccount = {
  id: 'sa-1',
  brandId: 'brand-1',
  platform: 'linkedin',
  platformUserId: 'li-123',
  platformUsername: 'mktengine',
  status: 'active',
  tokenExpiresAt: new Date('2025-06-01'),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('social-account.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('connectSocialAccount', () => {
    it('should encrypt tokens and create account', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
      mockPrisma.socialAccount.findUnique.mockResolvedValue(null);
      mockPrisma.socialAccount.create.mockResolvedValue(mockAccount);

      const result = await socialAccountService.connectSocialAccount({
        brandId: 'brand-1',
        platform: 'linkedin',
        accessToken: 'my-token',
        refreshToken: 'my-refresh',
      });

      expect(mockEncrypt).toHaveBeenCalledWith('my-token');
      expect(mockEncrypt).toHaveBeenCalledWith('my-refresh');
      expect(result.id).toBe('sa-1');
    });

    it('should not encrypt refreshToken if not provided', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
      mockPrisma.socialAccount.findUnique.mockResolvedValue(null);
      mockPrisma.socialAccount.create.mockResolvedValue(mockAccount);

      await socialAccountService.connectSocialAccount({
        brandId: 'brand-1',
        platform: 'linkedin',
        accessToken: 'my-token',
      });

      expect(mockEncrypt).toHaveBeenCalledTimes(1);
      expect(mockPrisma.socialAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ refreshTokenEncrypted: null }),
        }),
      );
    });

    it('should throw NOT_FOUND if brand does not exist', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(null);

      await expect(
        socialAccountService.connectSocialAccount({ brandId: 'missing', platform: 'x', accessToken: 't' }),
      ).rejects.toThrow(AppError);
    });

    it('should throw CONFLICT if account already connected', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
      mockPrisma.socialAccount.findUnique.mockResolvedValue(mockAccount);

      try {
        await socialAccountService.connectSocialAccount({
          brandId: 'brand-1',
          platform: 'linkedin',
          accessToken: 't',
        });
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(409);
        expect((err as AppError).code).toBe('CONFLICT');
      }
    });

    it('should exclude encrypted fields from return via select', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
      mockPrisma.socialAccount.findUnique.mockResolvedValue(null);
      mockPrisma.socialAccount.create.mockResolvedValue(mockAccount);

      await socialAccountService.connectSocialAccount({
        brandId: 'brand-1',
        platform: 'twitter',
        accessToken: 't',
      });

      const createCall = mockPrisma.socialAccount.create.mock.calls[0][0];
      expect(createCall.select).toBeDefined();
      expect(createCall.select.accessTokenEncrypted).toBeUndefined();
      expect(createCall.select.refreshTokenEncrypted).toBeUndefined();
    });
  });

  describe('listSocialAccounts', () => {
    it('should return accounts without encrypted fields', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
      mockPrisma.socialAccount.findMany.mockResolvedValue([mockAccount]);

      const result = await socialAccountService.listSocialAccounts('brand-1');

      expect(result).toHaveLength(1);
      const findManyCall = mockPrisma.socialAccount.findMany.mock.calls[0][0];
      expect(findManyCall.select.accessTokenEncrypted).toBeUndefined();
    });

    it('should throw NOT_FOUND if brand does not exist', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(null);

      await expect(socialAccountService.listSocialAccounts('missing')).rejects.toThrow(AppError);
    });
  });

  describe('disconnectSocialAccount', () => {
    it('should delete existing account', async () => {
      mockPrisma.socialAccount.findFirst.mockResolvedValue(mockAccount);
      mockPrisma.socialAccount.delete.mockResolvedValue(mockAccount);

      await socialAccountService.disconnectSocialAccount('sa-1');

      expect(mockPrisma.socialAccount.delete).toHaveBeenCalledWith({ where: { id: 'sa-1' } });
    });

    it('should throw NOT_FOUND for missing account', async () => {
      mockPrisma.socialAccount.findFirst.mockResolvedValue(null);

      await expect(socialAccountService.disconnectSocialAccount('missing')).rejects.toThrow(AppError);
    });
  });

  describe('connectAdAccount', () => {
    it('should create ad account with encrypted credentials', async () => {
      const mockAdAccount = { id: 'aa-1', platform: 'meta', platformAccountId: 'act_123' };
      mockPrisma.socialAccount.findFirst.mockResolvedValue(mockAccount);
      mockPrisma.adAccount.create.mockResolvedValue(mockAdAccount);

      const result = await socialAccountService.connectAdAccount('sa-1', {
        platform: 'meta',
        platformAccountId: 'act_123',
        credentials: 'secret-creds',
      });

      expect(mockEncrypt).toHaveBeenCalledWith('secret-creds');
      expect(result.id).toBe('aa-1');
    });

    it('should throw NOT_FOUND for missing social account', async () => {
      mockPrisma.socialAccount.findFirst.mockResolvedValue(null);

      await expect(
        socialAccountService.connectAdAccount('missing', { platform: 'meta', platformAccountId: 'x' }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('listAdAccounts', () => {
    it('should return ad accounts for social account', async () => {
      mockPrisma.socialAccount.findFirst.mockResolvedValue(mockAccount);
      mockPrisma.adAccount.findMany.mockResolvedValue([{ id: 'aa-1' }]);

      const result = await socialAccountService.listAdAccounts('sa-1');

      expect(result).toHaveLength(1);
    });

    it('should throw NOT_FOUND for missing social account', async () => {
      mockPrisma.socialAccount.findFirst.mockResolvedValue(null);

      await expect(socialAccountService.listAdAccounts('missing')).rejects.toThrow(AppError);
    });
  });

  describe('disconnectAdAccount', () => {
    it('should delete existing ad account', async () => {
      mockPrisma.adAccount.findFirst.mockResolvedValue({ id: 'aa-1' });
      mockPrisma.adAccount.delete.mockResolvedValue({ id: 'aa-1' });

      await socialAccountService.disconnectAdAccount('aa-1');

      expect(mockPrisma.adAccount.delete).toHaveBeenCalledWith({ where: { id: 'aa-1' } });
    });

    it('should throw NOT_FOUND for missing ad account', async () => {
      mockPrisma.adAccount.findFirst.mockResolvedValue(null);

      await expect(socialAccountService.disconnectAdAccount('missing')).rejects.toThrow(AppError);
    });
  });
});
