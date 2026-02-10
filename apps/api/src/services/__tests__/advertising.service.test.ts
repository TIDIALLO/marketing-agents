import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';

const mockPrisma = {
  brand: { findFirst: vi.fn() },
  competitorAd: { create: vi.fn(), findMany: vi.fn() },
  contentSignal: { findFirst: vi.fn() },
  adCampaign: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  adSet: { create: vi.fn(), update: vi.fn() },
  adCreative: { create: vi.fn(), update: vi.fn() },
  adMetrics: { create: vi.fn(), aggregate: vi.fn() },
  aiLearningLog: { create: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({
  claudeGenerate: vi.fn().mockResolvedValue(JSON.stringify({
    name: 'Campagne SOC',
    objective: 'traffic',
    dailyBudget: 15,
    totalBudget: 450,
    targeting: { ageMin: 25, ageMax: 55, locations: ['FR'] },
    kpiTargets: { targetCpc: 0.3, targetCtr: 2.5, targetRoas: 3.0 },
    adSets: [{ name: 'Set A', budgetPercent: 50 }],
    creatives: [{ title: 'Creative 1', body: 'Body text', callToAction: 'LEARN_MORE', imagePrompt: 'modern SOC dashboard' }],
    reasoning: 'Strategy reasoning',
  })),
  dalleGenerate: vi.fn().mockResolvedValue('https://dalle.example.com/img.png'),
}));
vi.mock('../../lib/slack', () => ({ sendSlackNotification: vi.fn().mockResolvedValue(true) }));
vi.mock('../../lib/socket', () => ({ emitEvent: vi.fn() }));
vi.mock('../../lib/n8n', () => ({ triggerWorkflow: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock('../../lib/meta-ads', () => ({
  isMetaConfigured: vi.fn().mockReturnValue(false),
  searchAdLibrary: vi.fn(),
  createCampaign: vi.fn(),
  createAdSet: vi.fn(),
  createAdCreative: vi.fn(),
  createAd: vi.fn(),
  getCampaignInsights: vi.fn(),
  getAdSetInsights: vi.fn(),
  updateCampaignStatus: vi.fn(),
  updateAdSetStatus: vi.fn(),
  updateAdSetBudget: vi.fn(),
}));

const advertisingService = await import('../advertising.service');

const mockBrand = { name: 'Synap6ia', brandVoice: { tone: ['expert'] }, targetAudience: { segment: 'PME' } };

describe('advertising.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('runCompetitorResearch', () => {
    it('should generate mock competitor ads when Meta is not configured', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', ...mockBrand });
      mockPrisma.competitorAd.create.mockResolvedValue({ id: 'ca-1', competitorName: 'Concurrent A' });

      const results = await advertisingService.runCompetitorResearch('brand-1');

      expect(results).toHaveLength(2);
      expect(mockPrisma.competitorAd.create).toHaveBeenCalledTimes(2);
    });

    it('should throw NOT_FOUND for missing brand', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(null);
      await expect(advertisingService.runCompetitorResearch('missing')).rejects.toThrow(AppError);
    });
  });

  describe('listCompetitorAds', () => {
    it('should list ads with filters', async () => {
      mockPrisma.competitorAd.findMany.mockResolvedValue([{ id: 'ca-1' }]);
      const result = await advertisingService.listCompetitorAds({ brandId: 'brand-1', platform: 'facebook' });
      expect(result).toHaveLength(1);
      expect(mockPrisma.competitorAd.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { brandId: 'brand-1', platform: 'facebook' } }),
      );
    });
  });

  describe('generateCampaignProposal', () => {
    it('should generate campaign with ad sets and creatives', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', ...mockBrand });
      mockPrisma.competitorAd.findMany.mockResolvedValue([]);
      mockPrisma.adCampaign.create.mockResolvedValue({ id: 'ac-1', name: 'Campagne SOC', status: 'draft' });
      mockPrisma.adSet.create.mockResolvedValue({ id: 'as-1' });
      mockPrisma.adCreative.create.mockResolvedValue({ id: 'acr-1' });
      mockPrisma.adCampaign.findFirst.mockResolvedValue({
        id: 'ac-1', name: 'Campagne SOC', adSets: [{ id: 'as-1' }], creatives: [{ id: 'acr-1' }],
      });

      const result = await advertisingService.generateCampaignProposal({
        brandId: 'brand-1', adAccountId: 'aa-1', platform: 'facebook',
      });

      expect(result).toBeDefined();
      expect(result!.name).toBe('Campagne SOC');
      expect(mockPrisma.adSet.create).toHaveBeenCalledOnce();
      expect(mockPrisma.adCreative.create).toHaveBeenCalledOnce();
    });

    it('should include content signal context when provided', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', ...mockBrand });
      mockPrisma.contentSignal.findFirst.mockResolvedValue({
        id: 'cs-1', aiRecommendation: 'Boost this',
        contentPiece: { title: 'Winner', body: 'Great post', platform: 'linkedin', hashtags: [] },
      });
      mockPrisma.competitorAd.findMany.mockResolvedValue([]);
      mockPrisma.adCampaign.create.mockResolvedValue({ id: 'ac-1', status: 'draft' });
      mockPrisma.adSet.create.mockResolvedValue({});
      mockPrisma.adCreative.create.mockResolvedValue({});
      mockPrisma.adCampaign.findFirst.mockResolvedValue({ id: 'ac-1', adSets: [], creatives: [] });

      await advertisingService.generateCampaignProposal({
        brandId: 'brand-1', adAccountId: 'aa-1', contentSignalId: 'cs-1', platform: 'facebook',
      });

      expect(mockPrisma.contentSignal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cs-1' } }),
      );
    });

    it('should throw NOT_FOUND for missing brand', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(null);
      await expect(
        advertisingService.generateCampaignProposal({ brandId: 'x', adAccountId: 'y', platform: 'facebook' }),
      ).rejects.toThrow(AppError);
    });

    it('should throw UNPROCESSABLE_ENTITY when AI returns invalid JSON', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', ...mockBrand });
      mockPrisma.competitorAd.findMany.mockResolvedValue([]);
      const { claudeGenerate } = await import('../../lib/ai');
      (claudeGenerate as any).mockResolvedValueOnce('not json');

      await expect(
        advertisingService.generateCampaignProposal({ brandId: 'brand-1', adAccountId: 'aa-1', platform: 'facebook' }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('launchCampaign', () => {
    it('should launch campaign with mock platform IDs', async () => {
      const campaign = {
        id: 'ac-1', name: 'Test Campaign', platform: 'facebook', status: 'approved',
        dailyBudget: 15, platformCampaignId: null,
        adSets: [{ id: 'as-1', name: 'Set A' }],
        creatives: [{ id: 'acr-1', title: 'Creative' }],
      };
      mockPrisma.adCampaign.findFirst.mockResolvedValue(campaign);
      mockPrisma.adSet.update.mockResolvedValue({});
      mockPrisma.adCreative.update.mockResolvedValue({});
      mockPrisma.adCampaign.update.mockResolvedValue({ ...campaign, status: 'active' });

      const result = await advertisingService.launchCampaign('ac-1');

      expect(result.status).toBe('active');
      const { emitEvent } = await import('../../lib/socket');
      expect(emitEvent).toHaveBeenCalledWith('campaign:launched', expect.objectContaining({ campaignId: 'ac-1' }));
      const { sendSlackNotification } = await import('../../lib/slack');
      expect(sendSlackNotification).toHaveBeenCalled();
    });

    it('should throw NOT_FOUND for non-approved campaign', async () => {
      mockPrisma.adCampaign.findFirst.mockResolvedValue(null);
      await expect(advertisingService.launchCampaign('missing')).rejects.toThrow(AppError);
    });
  });

  describe('collectAdMetrics', () => {
    it('should collect mock metrics for active campaigns', async () => {
      mockPrisma.adCampaign.findMany.mockResolvedValue([{
        id: 'ac-1', name: 'Test', platform: 'facebook', dailyBudget: 15,
        platformCampaignId: 'fb-123', adSets: [],
      }]);
      mockPrisma.adMetrics.create.mockResolvedValue({});
      mockPrisma.adMetrics.aggregate.mockResolvedValue({ _avg: { cpc: 0.3, roas: 3.0 } });

      const results = await advertisingService.collectAdMetrics();

      expect(results).toHaveLength(1);
      expect(results[0].collected).toBe(true);
      expect(mockPrisma.adMetrics.create).toHaveBeenCalled();
    });

    it('should return empty array when no active campaigns', async () => {
      mockPrisma.adCampaign.findMany.mockResolvedValue([]);
      const results = await advertisingService.collectAdMetrics();
      expect(results).toEqual([]);
    });
  });

  describe('optimizeCampaigns', () => {
    it('should skip campaigns with fewer than 3 data points', async () => {
      mockPrisma.adCampaign.findMany.mockResolvedValue([{
        id: 'ac-1', name: 'Test', platform: 'facebook', dailyBudget: 15,
        adSets: [], creatives: [], metrics: [{ roas: 2, cpc: 0.3, ctr: 2, spend: 10 }],
      }]);

      const results = await advertisingService.optimizeCampaigns();

      expect(results).toEqual([]);
    });

    it('should analyze campaigns and log optimizations', async () => {
      const metrics = Array.from({ length: 5 }, () => ({ roas: 2, cpc: 0.3, ctr: 2.5, spend: 15 }));
      const { claudeGenerate } = await import('../../lib/ai');
      (claudeGenerate as any).mockResolvedValueOnce(JSON.stringify({
        actions: [{ type: 'scale_budget', target: 'Set A', reason: 'Good CTR' }],
        summary: 'Scale winning ad set',
      }));

      mockPrisma.adCampaign.findMany.mockResolvedValue([{
        id: 'ac-1', name: 'Test', platform: 'facebook', dailyBudget: 15,
        adSets: [{ name: 'Set A', id: 'as-1', dailyBudget: 7.5 }],
        creatives: [{ id: 'acr-1' }],
        metrics,
      }]);
      mockPrisma.aiLearningLog.create.mockResolvedValue({});

      const results = await advertisingService.optimizeCampaigns();

      expect(results).toHaveLength(1);
      expect(results[0].actions).toHaveLength(1);
      expect(mockPrisma.aiLearningLog.create).toHaveBeenCalledOnce();
      const { sendSlackNotification } = await import('../../lib/slack');
      expect(sendSlackNotification).toHaveBeenCalled();
    });
  });

  describe('getCampaignById', () => {
    it('should return campaign with includes', async () => {
      mockPrisma.adCampaign.findFirst.mockResolvedValue({ id: 'ac-1', name: 'Test', adSets: [], creatives: [], metrics: [] });
      const result = await advertisingService.getCampaignById('ac-1');
      expect(result.name).toBe('Test');
    });

    it('should throw NOT_FOUND', async () => {
      mockPrisma.adCampaign.findFirst.mockResolvedValue(null);
      await expect(advertisingService.getCampaignById('x')).rejects.toThrow(AppError);
    });
  });

  describe('pauseCampaign', () => {
    it('should pause active campaign', async () => {
      mockPrisma.adCampaign.findFirst.mockResolvedValue({ id: 'ac-1', name: 'Test', platform: 'facebook', status: 'active' });
      mockPrisma.adCampaign.update.mockResolvedValue({ id: 'ac-1', status: 'paused' });

      const result = await advertisingService.pauseCampaign('ac-1');

      expect(result.status).toBe('paused');
      const { emitEvent } = await import('../../lib/socket');
      expect(emitEvent).toHaveBeenCalledWith('campaign:paused', expect.objectContaining({ campaignId: 'ac-1' }));
    });

    it('should throw NOT_FOUND for non-active campaign', async () => {
      mockPrisma.adCampaign.findFirst.mockResolvedValue(null);
      await expect(advertisingService.pauseCampaign('x')).rejects.toThrow(AppError);
    });
  });
});
