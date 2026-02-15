import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  socialAccount: { findMany: vi.fn(), update: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/encryption', () => ({
  encrypt: vi.fn().mockImplementation((t: string) => `enc:${t}`),
  decrypt: vi.fn().mockReturnValue('decrypted-refresh-token'),
}));
vi.mock('../../lib/slack', () => ({ sendSlackNotification: vi.fn().mockResolvedValue(true) }));
vi.mock('../../lib/linkedin', () => ({
  refreshLinkedInToken: vi.fn().mockResolvedValue({ accessToken: 'new-li-token', refreshToken: 'new-li-refresh', expiresIn: 3600 }),
}));
vi.mock('../../lib/twitter', () => ({
  refreshTwitterToken: vi.fn().mockResolvedValue({ accessToken: 'new-tw-token', refreshToken: 'new-tw-refresh', expiresIn: 7200 }),
}));

const oauthService = await import('../oauth-refresh.service');

describe('oauth-refresh.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('refreshExpiringTokens', () => {
    it('should refresh LinkedIn tokens', async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([
        { id: 'sa-1', platform: 'linkedin', refreshTokenEncrypted: 'enc-token', platformUsername: 'mktengine', brand: { name: 'MarketingEngine' } },
      ]);
      mockPrisma.socialAccount.update.mockResolvedValue({});

      const results = await oauthService.refreshExpiringTokens();

      expect(results).toHaveLength(1);
      expect(results[0].refreshed).toBe(true);
      expect(mockPrisma.socialAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accessTokenEncrypted: expect.stringContaining('enc:'),
          }),
        }),
      );
    });

    it('should refresh Twitter tokens', async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([
        { id: 'sa-2', platform: 'twitter', refreshTokenEncrypted: 'enc-token', platformUsername: 'mktengine', brand: { name: 'MarketingEngine' } },
      ]);
      mockPrisma.socialAccount.update.mockResolvedValue({});

      const results = await oauthService.refreshExpiringTokens();
      expect(results[0].refreshed).toBe(true);
    });

    it('should handle refresh failure and send Slack alert', async () => {
      const { refreshLinkedInToken } = await import('../../lib/linkedin');
      (refreshLinkedInToken as any).mockRejectedValueOnce(new Error('Token revoked'));

      mockPrisma.socialAccount.findMany.mockResolvedValue([
        { id: 'sa-1', platform: 'linkedin', refreshTokenEncrypted: 'enc', platformUsername: 'mktengine', brand: { name: 'MarketingEngine' } },
      ]);

      const results = await oauthService.refreshExpiringTokens();

      expect(results[0].refreshed).toBe(false);
      expect(results[0].error).toBe('Token revoked');
      const { sendSlackNotification } = await import('../../lib/slack');
      expect(sendSlackNotification).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('URGENT') }),
      );
    });

    it('should return empty array when no accounts need refresh', async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([]);
      const results = await oauthService.refreshExpiringTokens();
      expect(results).toEqual([]);
    });

    it('should throw for unsupported platform', async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([
        { id: 'sa-3', platform: 'tiktok', refreshTokenEncrypted: 'enc', platformUsername: 'test', brand: { name: 'Test' } },
      ]);

      const results = await oauthService.refreshExpiringTokens();
      expect(results[0].refreshed).toBe(false);
      expect(results[0].error).toContain('Unsupported platform');
    });
  });
});
