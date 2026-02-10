import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  contentPiece: { findMany: vi.fn() },
  contentSignal: { upsert: vi.fn() },
  adCampaign: { findMany: vi.fn() },
  aiLearningLog: { create: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({
  claudeGenerate: vi.fn().mockResolvedValue(JSON.stringify({
    shouldBoost: true, confidence: 0.9,
    recommendedBudget: 15, recommendedDuration: 7,
    targetAudience: 'PME cybersecurity', reasoning: 'Strong engagement signals',
    patterns: [{ description: 'Cross-channel synergy', recommendation: 'Scale budget' }],
    summary: 'Good cross-channel results',
  })),
}));
vi.mock('../../lib/redis', () => ({ publishEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../lib/slack', () => ({ sendSlackNotification: vi.fn().mockResolvedValue(true) }));
vi.mock('../../lib/socket', () => ({ emitEvent: vi.fn() }));

const signalCrossrefService = await import('../signal-crossref.service');

describe('signal-crossref.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('detectBoostOpportunities', () => {
    it('should detect high-engagement content and create signals', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([{
        id: 'cp-1', title: 'Winner', platform: 'linkedin', engagementScore: 85, brandId: 'brand-1',
        metrics: [{ impressions: 5000, engagements: 400, engagementRate: 8, shares: 25 }],
        brand: { socialAccounts: [{ adAccounts: [{ id: 'aa-1' }] }] },
      }]);
      mockPrisma.contentSignal.upsert.mockResolvedValue({ id: 'cs-1', signalType: 'boost_opportunity' });

      const result = await signalCrossrefService.detectBoostOpportunities();

      expect(result.opportunities).toBeGreaterThanOrEqual(1);
      expect(mockPrisma.contentSignal.upsert).toHaveBeenCalled();
    });

    it('should return zero opportunities when no content qualifies', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([]);

      const result = await signalCrossrefService.detectBoostOpportunities();

      expect(result.opportunities).toBe(0);
    });
  });

  describe('trackPaidToOrganicAttribution', () => {
    it('should track attribution for campaigns with content signals', async () => {
      mockPrisma.adCampaign.findMany.mockResolvedValue([{
        id: 'ac-1', name: 'Boost Campaign', platform: 'facebook',
        contentSignal: {
          contentPiece: {
            id: 'cp-1', title: 'Organic Post',
            metrics: [{ impressions: 10000, engagements: 800 }],
          },
        },
        metrics: [{ spend: 50, impressions: 3000, reach: 2500 }],
      }]);
      mockPrisma.aiLearningLog.create.mockResolvedValue({});

      const result = await signalCrossrefService.trackPaidToOrganicAttribution();

      expect(result.attributions.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty attributions when no campaigns', async () => {
      mockPrisma.adCampaign.findMany.mockResolvedValue([]);

      const result = await signalCrossrefService.trackPaidToOrganicAttribution();

      expect(result.attributions).toEqual([]);
    });
  });

  describe('runSignalCrossReference', () => {
    it('should run both analyses', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([]);
      mockPrisma.adCampaign.findMany.mockResolvedValue([]);

      const result = await signalCrossrefService.runSignalCrossReference();

      expect(result.boostOpportunities).toBeDefined();
      expect(result.attributions).toBeDefined();
    });
  });
});
