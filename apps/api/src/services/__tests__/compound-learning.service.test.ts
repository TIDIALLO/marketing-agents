import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  contentPiece: { findMany: vi.fn() },
  brand: { findUniqueOrThrow: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  aiLearningLog: { findMany: vi.fn(), create: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({
  claudeGenerate: vi.fn().mockResolvedValue(JSON.stringify({
    confidenceScore: 75,
    adjustments: {
      frameworks: ['AIDA', 'case-study'],
      vocabulary: { addPreferred: ['cybersec'], addAvoided: [] },
      newGoodExamples: ['SOC case study post'],
      newBadExamples: [],
      platformOverrides: {},
    },
    reasoning: 'Case studies perform 40% better',
  })),
}));
vi.mock('../../lib/redis', () => ({ publishEvent: vi.fn().mockResolvedValue(undefined) }));

const compoundLearningService = await import('../compound-learning.service');

describe('compound-learning.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('analyzeFrameworkPerformance', () => {
    it('should rank frameworks by engagement', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([
        { id: 'cp-1', platform: 'linkedin', body: '[AIDA] Content', engagementScore: 80, metrics: [{ impressions: 1000, engagements: 100, engagementRate: 10 }] },
        { id: 'cp-2', platform: 'linkedin', body: '[PAS] Content', engagementScore: 60, metrics: [{ impressions: 800, engagements: 40, engagementRate: 5 }] },
      ]);

      const result = await compoundLearningService.analyzeFrameworkPerformance(60);

      expect(result.totalPieces).toBe(2);
      expect(result.rankings).toBeDefined();
    });
  });

  describe('autoUpdateBrandVoice', () => {
    it('should update brand voice when confidence is high enough', async () => {
      mockPrisma.brand.findUniqueOrThrow.mockResolvedValue({
        id: 'brand-1', name: 'MarketingEngine',
        brandVoice: { tone: ['expert'], frameworks: ['AIDA'], vocabulary: { preferred: [], avoided: [] }, examples: { good: [], bad: [] } },
      });
      mockPrisma.contentPiece.findMany.mockResolvedValue([
        { id: 'cp-1', platform: 'linkedin', body: '[AIDA]', engagementScore: 90, metrics: [{ impressions: 2000, engagements: 300, engagementRate: 15 }] },
      ]);
      mockPrisma.brand.update.mockResolvedValue({ id: 'brand-1' });
      mockPrisma.aiLearningLog.create.mockResolvedValue({});

      const result = await compoundLearningService.autoUpdateBrandVoice('brand-1');

      expect(result.updated).toBe(true);
      expect(mockPrisma.brand.update).toHaveBeenCalled();
    });

    it('should not update when no brand voice configured', async () => {
      mockPrisma.brand.findUniqueOrThrow.mockResolvedValue({
        id: 'brand-1', name: 'MarketingEngine', brandVoice: null,
      });

      const result = await compoundLearningService.autoUpdateBrandVoice('brand-1');

      expect(result.updated).toBe(false);
      expect(result.reason).toContain('No brand voice');
    });

    it('should not update when confidence is too low', async () => {
      const { claudeGenerate } = await import('../../lib/ai');
      // First call: framework perf analysis (called inside autoUpdateBrandVoice)
      (claudeGenerate as any).mockResolvedValueOnce(JSON.stringify({
        confidenceScore: 40,
        adjustments: { frameworks: [], vocabulary: {}, platformOverrides: {} },
        reasoning: 'Not enough data',
      }));

      mockPrisma.brand.findUniqueOrThrow.mockResolvedValue({
        id: 'brand-1', name: 'MarketingEngine',
        brandVoice: { tone: ['expert'], frameworks: [], vocabulary: { preferred: [], avoided: [] }, examples: { good: [], bad: [] } },
      });
      mockPrisma.contentPiece.findMany.mockResolvedValue([]);
      mockPrisma.aiLearningLog.create.mockResolvedValue({});

      const result = await compoundLearningService.autoUpdateBrandVoice('brand-1');

      // If confidence < 60 it returns updated: false, but it still logs
      expect(result.updated).toBe(false);
    });
  });

  describe('trackPromptEffectiveness', () => {
    it('should aggregate prompt effectiveness by agent', async () => {
      mockPrisma.aiLearningLog.findMany.mockResolvedValue([
        { agentType: 'content_flywheel', actionType: 'generate', outcome: 'published', input: {}, output: {} },
        { agentType: 'content_flywheel', actionType: 'generate', outcome: 'failed', input: {}, output: {} },
      ]);

      const result = await compoundLearningService.trackPromptEffectiveness(30);

      expect(result.totalActions).toBe(2);
      expect(result.agents).toBeDefined();
    });
  });
});
