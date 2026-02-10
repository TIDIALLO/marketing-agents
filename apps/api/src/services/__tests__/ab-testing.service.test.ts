import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  aBTest: { create: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  contentPiece: { findUniqueOrThrow: vi.fn(), create: vi.fn() },
  emailTemplate: { findUniqueOrThrow: vi.fn(), create: vi.fn() },
  adCreative: { findUniqueOrThrow: vi.fn(), create: vi.fn() },
  contentMetrics: { aggregate: vi.fn() },
  emailCampaign: { aggregate: vi.fn() },
  adMetrics: { aggregate: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({
  claudeGenerate: vi.fn().mockResolvedValue(JSON.stringify({
    title: 'Variant Title', body: 'Variant body text', hashtags: ['#test'], callToAction: 'Try now',
  })),
}));

const abTestingService = await import('../ab-testing.service');

describe('ab-testing.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('createTest', () => {
    it('should create A/B test with content piece variant', async () => {
      mockPrisma.contentPiece.findUniqueOrThrow.mockResolvedValue({
        id: 'cp-1', brandId: 'brand-1', title: 'Original', body: 'Body', hashtags: ['#soc'],
        platform: 'linkedin', contentInputId: 'ci-1', mediaUrl: null, mediaPrompt: null,
      });
      mockPrisma.contentPiece.create.mockResolvedValue({ id: 'cp-variant' });
      mockPrisma.aBTest.create.mockResolvedValue({
        id: 'ab-1', name: 'Test 1', entityType: 'content_piece', controlId: 'cp-1', variantId: 'cp-variant', status: 'running',
      });

      const result = await abTestingService.createTest({
        name: 'Test 1', entityType: 'content_piece', controlId: 'cp-1',
      });

      expect(result.test.status).toBe('running');
      expect(result.test.variantId).toBe('cp-variant');
      expect(mockPrisma.contentPiece.create).toHaveBeenCalledOnce();
    });
  });

  describe('collectResults', () => {
    it('should collect content metrics for running test', async () => {
      mockPrisma.aBTest.findUniqueOrThrow.mockResolvedValue({
        id: 'ab-1', entityType: 'content_piece', controlId: 'cp-1', variantId: 'cp-2', status: 'running',
      });
      mockPrisma.contentMetrics.aggregate
        .mockResolvedValueOnce({ _sum: { impressions: 1000, engagements: 100 } }) // control
        .mockResolvedValueOnce({ _sum: { impressions: 1000, engagements: 150 } }); // variant
      mockPrisma.aBTest.update.mockResolvedValue({
        id: 'ab-1', controlMetrics: { impressions: 1000, engagements: 100 }, variantMetrics: { impressions: 1000, engagements: 150 },
      });

      const result = await abTestingService.collectResults('ab-1');

      expect(result.test).toBeDefined();
      expect(mockPrisma.aBTest.update).toHaveBeenCalled();
    });

    it('should return message for non-running test', async () => {
      mockPrisma.aBTest.findUniqueOrThrow.mockResolvedValue({
        id: 'ab-1', status: 'concluded',
      });

      const result = await abTestingService.collectResults('ab-1');

      expect(result.message).toContain('not running');
    });
  });

  describe('determineWinner', () => {
    it('should determine winner when confidence is sufficient', async () => {
      mockPrisma.aBTest.findUniqueOrThrow.mockResolvedValue({
        id: 'ab-1', status: 'running',
        controlViews: 5000, variantViews: 5000,
        controlMetrics: { impressions: 5000, engagements: 200 },
        variantMetrics: { impressions: 5000, engagements: 400 },
      });
      mockPrisma.aBTest.update.mockResolvedValue({
        id: 'ab-1', status: 'concluded', winner: 'variant', confidence: 0.99,
      });

      const result = await abTestingService.determineWinner('ab-1');

      expect(result.test.winner).toBe('variant');
      expect(result.test.status).toBe('concluded');
    });

    it('should report not ready with insufficient data', async () => {
      mockPrisma.aBTest.findUniqueOrThrow.mockResolvedValue({
        id: 'ab-1', status: 'running',
        controlViews: 10, variantViews: 10,
        controlMetrics: { impressions: 10, engagements: 1 },
        variantMetrics: { impressions: 10, engagements: 2 },
      });

      const result = await abTestingService.determineWinner('ab-1');

      expect(result.ready).toBe(false);
      expect(result.message).toContain('Insufficient');
    });
  });

  describe('listTests', () => {
    it('should list tests with filters', async () => {
      mockPrisma.aBTest.findMany.mockResolvedValue([{ id: 'ab-1', status: 'running' }]);
      const result = await abTestingService.listTests({ status: 'running' });
      expect(result).toHaveLength(1);
    });
  });
});
