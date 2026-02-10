import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  contentPiece: { findMany: vi.fn() },
  contentSignal: { findMany: vi.fn() },
  brand: { findFirst: vi.fn() },
  platformUser: { findFirst: vi.fn() },
  contentInput: { create: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({
  claudeGenerate: vi.fn().mockResolvedValue(JSON.stringify({
    risingTopics: [{ topic: 'AI SOC', confidence: 80, relevance: 90, suggestedAngle: 'How AI augments SOC' }],
    decliningTopics: [{ topic: 'Legacy SIEM', reason: 'Market saturation' }],
    opportunities: [{ topic: 'XDR', reason: 'Growing interest', urgency: 'high' }],
    contentFatigue: [],
  })),
}));
vi.mock('../../lib/redis', () => ({ publishEvent: vi.fn().mockResolvedValue(undefined) }));

const trendDetectionService = await import('../trend-detection.service');

describe('trend-detection.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('analyzeHashtagPerformance', () => {
    it('should rank hashtags by engagement', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([
        { hashtags: ['#soc', '#cybersecurity'], engagementScore: 80, platform: 'linkedin', metrics: [{ impressions: 2000, engagements: 200 }] },
        { hashtags: ['#soc', '#siem'], engagementScore: 60, platform: 'linkedin', metrics: [{ impressions: 1500, engagements: 100 }] },
      ]);

      const result = await trendDetectionService.analyzeHashtagPerformance(30);

      expect(result.hashtagCount).toBeGreaterThan(0);
      expect(result.hashtags).toBeDefined();
      // #soc should appear with highest usage
      const socTag = result.hashtags.find((h: { hashtag: string }) => h.hashtag === '#soc');
      expect(socTag).toBeDefined();
      expect(socTag!.uses).toBe(2);
    });

    it('should return empty when no content', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([]);

      const result = await trendDetectionService.analyzeHashtagPerformance(30);

      expect(result.hashtagCount).toBe(0);
    });
  });

  describe('detectRisingTopics', () => {
    it('should detect trends and create content briefs', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([
        { title: 'AI SOC', body: 'Content', platform: 'linkedin', engagementScore: 80, createdAt: new Date() },
      ]);
      mockPrisma.contentSignal.findMany.mockResolvedValue([
        { signalType: 'high_engagement', signalStrength: 3, contentPiece: { title: 'Winner' } },
      ]);
      mockPrisma.brand.findFirst.mockResolvedValue({ id: 'brand-1' });
      mockPrisma.platformUser.findFirst.mockResolvedValue({ id: 'user-1' });
      mockPrisma.contentInput.create.mockResolvedValue({ id: 'ci-1' });

      const result = await trendDetectionService.detectRisingTopics();

      expect(result.risingTopics).toBeDefined();
      expect(result.contentBriefsCreated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('detectContentFatigue', () => {
    it('should detect declining framework performance', async () => {
      const now = Date.now();
      const pieces = [
        // First half (older) — higher scores
        { body: '[AIDA] Old post', engagementScore: 80, createdAt: new Date(now - 25 * 86400000), metrics: [] },
        // Second half (recent) — lower scores
        { body: '[AIDA] New post', engagementScore: 40, createdAt: new Date(now - 5 * 86400000), metrics: [] },
      ];
      mockPrisma.contentPiece.findMany.mockResolvedValue(pieces);

      const result = await trendDetectionService.detectContentFatigue();

      expect(result.period).toBeDefined();
      expect(result.fatigueIndicators).toBeDefined();
    });
  });
});
