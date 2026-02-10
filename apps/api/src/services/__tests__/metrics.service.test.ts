import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  contentPiece: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  contentMetrics: { create: vi.fn(), findMany: vi.fn() },
  contentSignal: { create: vi.fn(), findMany: vi.fn() },
  socialAccount: { findUnique: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({
  claudeGenerate: vi.fn().mockResolvedValue(JSON.stringify({
    signalType: 'high_engagement', analysis: 'Strong hook and CTA', recommendation: 'Boost on paid',
  })),
}));
vi.mock('../../lib/redis', () => ({ publishEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../lib/slack', () => ({ sendSlackNotification: vi.fn().mockResolvedValue(true) }));
vi.mock('../../lib/socket', () => ({ emitEvent: vi.fn() }));
vi.mock('../../lib/encryption', () => ({ decrypt: vi.fn().mockReturnValue('access-token') }));
vi.mock('../../lib/linkedin', () => ({
  getLinkedInPostStats: vi.fn().mockResolvedValue({ impressions: 1000, engagements: 100, likes: 50, comments: 20, shares: 10, clicks: 30 }),
}));
vi.mock('../../lib/twitter', () => ({
  getTweetMetrics: vi.fn().mockResolvedValue({ impressions: 500, likes: 30, retweets: 10, replies: 5, quotes: 2 }),
}));

const metricsService = await import('../metrics.service');

describe('metrics.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('collectMetricsForPiece', () => {
    it('should collect LinkedIn metrics and calculate engagement score', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue({
        id: 'cp-1', platform: 'linkedin', platformPostId: 'li-post-1', publishedAt: new Date(Date.now() - 3600_000),
        brand: { socialAccounts: [{ id: 'sa-1', platform: 'linkedin' }] },
      });
      mockPrisma.socialAccount.findUnique.mockResolvedValue({ accessTokenEncrypted: 'enc-token' });
      mockPrisma.contentMetrics.create.mockResolvedValue({ id: 'cm-1' });
      mockPrisma.contentPiece.update.mockResolvedValue({});

      const result = await metricsService.collectMetricsForPiece('cp-1');

      expect(result).toBeDefined();
      expect(mockPrisma.contentMetrics.create).toHaveBeenCalledOnce();
      expect(mockPrisma.contentPiece.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ engagementScore: expect.any(Number) }) }),
      );
    });

    it('should return null for non-published piece', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(null);
      const result = await metricsService.collectMetricsForPiece('missing');
      expect(result).toBeNull();
    });
  });

  describe('detectWinningContent', () => {
    it('should detect content above threshold and create signals', async () => {
      const piece = (id: string, title: string, score: number) => ({ id, brandId: 'brand-1', title, body: 'Post body', platform: 'linkedin', hashtags: [], engagementScore: score });
      const metricsData = [
        { contentPieceId: 'cp-1', engagementRate: 25, impressions: 1000, likes: 200, comments: 50, shares: 30, contentPiece: piece('cp-1', 'Winner', 95), collectedAt: new Date() },
        { contentPieceId: 'cp-2', engagementRate: 2, impressions: 500, likes: 5, comments: 1, shares: 0, contentPiece: piece('cp-2', 'Normal', 10), collectedAt: new Date() },
        { contentPieceId: 'cp-3', engagementRate: 3, impressions: 600, likes: 10, comments: 2, shares: 1, contentPiece: piece('cp-3', 'Normal2', 15), collectedAt: new Date() },
        { contentPieceId: 'cp-4', engagementRate: 2, impressions: 400, likes: 4, comments: 1, shares: 0, contentPiece: piece('cp-4', 'Normal3', 8), collectedAt: new Date() },
        { contentPieceId: 'cp-5', engagementRate: 3, impressions: 450, likes: 6, comments: 2, shares: 0, contentPiece: piece('cp-5', 'Normal4', 12), collectedAt: new Date() },
      ];
      mockPrisma.contentMetrics.findMany.mockResolvedValue(metricsData);
      mockPrisma.contentSignal.create.mockResolvedValue({ id: 'cs-1', signalType: 'high_engagement', signalStrength: 2 });

      const signals = await metricsService.detectWinningContent();

      expect(signals.length).toBeGreaterThan(0);
      expect(mockPrisma.contentSignal.create).toHaveBeenCalled();
    });

    it('should return empty array when no recent metrics', async () => {
      mockPrisma.contentMetrics.findMany.mockResolvedValue([]);
      const result = await metricsService.detectWinningContent();
      expect(result).toEqual([]);
    });
  });

  describe('listSignals', () => {
    it('should list signals with content piece info', async () => {
      mockPrisma.contentSignal.findMany.mockResolvedValue([{ id: 'cs-1', signalType: 'high_engagement' }]);
      const result = await metricsService.listSignals();
      expect(result).toHaveLength(1);
    });
  });
});
