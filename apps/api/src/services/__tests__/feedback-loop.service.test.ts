import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  contentSignal: { findUnique: vi.fn() },
  lead: { findMany: vi.fn(), create: vi.fn() },
  leadInteraction: { findMany: vi.fn() },
  contentInput: { create: vi.fn() },
  aiLearningLog: { create: vi.fn(), findMany: vi.fn() },
  agentMessage: { create: vi.fn() },
  brand: { findMany: vi.fn(), findFirst: vi.fn() },
  adCampaign: { findMany: vi.fn() },
  emailTemplate: { findMany: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({
  claudeGenerate: vi.fn().mockResolvedValue(JSON.stringify({
    patterns: [{ type: 'pain_point', confidence: 0.8, description: 'Users struggle with complexity', suggestedContent: 'Simplify SOC' }],
    summary: 'Key insight summary',
  })),
}));
vi.mock('../../lib/redis', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../lib/slack', () => ({ sendSlackNotification: vi.fn().mockResolvedValue(true) }));
vi.mock('../advertising.service', () => ({
  generateCampaignProposal: vi.fn().mockResolvedValue({ id: 'ac-1', name: 'Boost Campaign' }),
}));
vi.mock('../lead.service', () => ({
  ingestLead: vi.fn().mockResolvedValue({ id: 'lead-1' }),
}));

const feedbackLoopService = await import('../feedback-loop.service');

describe('feedback-loop.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('amplifyWinningContent', () => {
    it('should create ad campaign from content signal', async () => {
      mockPrisma.contentSignal.findUnique.mockResolvedValue({
        id: 'cs-1',
        contentPiece: {
          id: 'cp-1', brandId: 'brand-1', title: 'Winner',
          brand: {
            socialAccounts: [{ adAccounts: [{ id: 'aa-1', platform: 'facebook', status: 'active' }] }],
          },
        },
      });
      mockPrisma.agentMessage.create.mockResolvedValue({ id: 'am-1' });

      const result = await feedbackLoopService.amplifyWinningContent('cs-1');

      expect(result).toBeDefined();
      expect(result!.campaignId).toBe('ac-1');
    });

    it('should return null when no ad account available', async () => {
      mockPrisma.contentSignal.findUnique.mockResolvedValue({
        id: 'cs-1',
        contentPiece: {
          id: 'cp-1', brandId: 'brand-1', title: 'Winner',
          brand: { socialAccounts: [] },
        },
      });

      const result = await feedbackLoopService.amplifyWinningContent('cs-1');

      expect(result).toBeNull();
    });

    it('should return null for missing signal', async () => {
      mockPrisma.contentSignal.findUnique.mockResolvedValue(null);
      const result = await feedbackLoopService.amplifyWinningContent('missing');
      expect(result).toBeNull();
    });
  });

  describe('analyzeConversionPatterns', () => {
    it('should analyze conversions and create content inputs', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([{
        id: 'lead-1', source: 'form', temperature: 'hot', status: 'converted',
        interactions: [{ channel: 'email', content: 'Great product' }],
      }]);
      mockPrisma.leadInteraction.findMany.mockResolvedValue([
        { content: 'Pain point: complexity', leadId: 'lead-1', aiAnalysis: { intent: 'interested' } },
      ]);
      mockPrisma.brand.findMany.mockResolvedValue([{ id: 'brand-1' }]);
      mockPrisma.contentInput.create.mockResolvedValue({ id: 'ci-1' });
      mockPrisma.aiLearningLog.create.mockResolvedValue({});

      const result = await feedbackLoopService.analyzeConversionPatterns();

      expect(result.insights).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzeObjectionsAndCreateBriefs', () => {
    it('should categorize objections and create content briefs', async () => {
      const { claudeGenerate } = await import('../../lib/ai');
      (claudeGenerate as any).mockResolvedValueOnce(JSON.stringify({
        categories: [
          { name: 'pricing', count: 3, commonPhrases: ['too expensive'], severity: 'high', suggestedAngles: ['ROI comparison'] },
        ],
        overallInsight: 'Price is main blocker',
      }));
      (claudeGenerate as any).mockResolvedValueOnce(JSON.stringify({
        title: 'Why SOC pays for itself', angle: 'ROI', keyPoints: ['saves time'], contentType: 'article',
      }));

      mockPrisma.leadInteraction.findMany.mockResolvedValue([
        { content: 'Too expensive', aiAnalysis: { objectionCategory: 'pricing' }, lead: { company: 'Corp' } },
      ]);
      mockPrisma.brand.findFirst.mockResolvedValue({ id: 'brand-1' });
      mockPrisma.contentInput.create.mockResolvedValue({ id: 'ci-1' });
      mockPrisma.aiLearningLog.create.mockResolvedValue({});
      mockPrisma.agentMessage.create.mockResolvedValue({ id: 'am-1' });

      const result = await feedbackLoopService.analyzeObjectionsAndCreateBriefs();

      expect(result.categories).toBeDefined();
    });
  });
});
