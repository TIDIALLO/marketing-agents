import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  brand: { findFirst: vi.fn(), findMany: vi.fn() },
  contentPiece: { count: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
  contentMetrics: { aggregate: vi.fn() },
  adMetrics: { aggregate: vi.fn() },
  lead: { count: vi.fn() },
  dailyAnalytics: { upsert: vi.fn(), findMany: vi.fn() },
  approvalQueue: { findMany: vi.fn(), count: vi.fn() },
  contentSchedule: { count: vi.fn(), findMany: vi.fn() },
  aiLearningLog: { groupBy: vi.fn() },
  platformUser: { findFirst: vi.fn(), findMany: vi.fn() },
  contentInput: { create: vi.fn() },
  adCampaign: { findUnique: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({ claudeGenerate: vi.fn().mockResolvedValue('Weekly report content') }));
vi.mock('../../lib/slack', () => ({ sendSlackNotification: vi.fn().mockResolvedValue(true) }));
vi.mock('../../lib/email', () => ({ sendWeeklyReportEmail: vi.fn().mockResolvedValue(undefined) }));

const reportingService = await import('../reporting.service');

describe('reporting.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('aggregateDailyAnalytics', () => {
    it('should aggregate metrics for all brands', async () => {
      mockPrisma.brand.findMany.mockResolvedValue([{ id: 'brand-1' }]);
      mockPrisma.contentPiece.count.mockResolvedValue(3);
      mockPrisma.contentMetrics.aggregate.mockResolvedValue({ _sum: { impressions: 5000, engagements: 500 }, _avg: { engagementRate: 10 } });
      mockPrisma.adMetrics.aggregate.mockResolvedValue({ _sum: { spend: 50 } });
      mockPrisma.lead.count
        .mockResolvedValueOnce(5)  // generated
        .mockResolvedValueOnce(2)  // qualified
        .mockResolvedValueOnce(1); // conversions
      mockPrisma.dailyAnalytics.upsert.mockResolvedValue({});

      const result = await reportingService.aggregateDailyAnalytics('2025-01-15');

      expect(result.aggregated).toBe(1);
      expect(mockPrisma.dailyAnalytics.upsert).toHaveBeenCalledOnce();
    });
  });

  describe('getStreamingKPIs', () => {
    it('should return real-time KPIs', async () => {
      mockPrisma.contentPiece.count.mockResolvedValue(5);
      mockPrisma.contentMetrics.aggregate.mockResolvedValue({ _sum: { engagements: 1000, impressions: 10000 } });
      mockPrisma.lead.count.mockResolvedValue(3);
      mockPrisma.adMetrics.aggregate.mockResolvedValue({ _avg: { roas: 3.5 } });
      mockPrisma.approvalQueue.count.mockResolvedValue(2);

      const result = await reportingService.getStreamingKPIs();

      expect(result.contentsPublished24h).toBe(5);
      expect(result.totalEngagements).toBe(1000);
      expect(result.avgROAS).toBe(3.5);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getThisWeekOverview', () => {
    it('should return weekly overview with action items', async () => {
      mockPrisma.contentPiece.count.mockResolvedValue(8);
      mockPrisma.contentSchedule.count
        .mockResolvedValueOnce(3)  // scheduled
        .mockResolvedValueOnce(0); // failed
      mockPrisma.approvalQueue.count.mockResolvedValue(2);
      mockPrisma.contentPiece.findFirst.mockResolvedValue({ id: 'cp-1', title: 'Top Post', engagementScore: 95 });
      mockPrisma.lead.count
        .mockResolvedValueOnce(10)  // newLeads
        .mockResolvedValueOnce(3);  // hotLeads
      mockPrisma.contentMetrics.aggregate.mockResolvedValue({
        _sum: { impressions: 50000, engagements: 5000, likes: 3000, comments: 1000, shares: 500 },
      });
      mockPrisma.contentSchedule.findMany.mockResolvedValue([]);

      const result = await reportingService.getThisWeekOverview();

      expect(result.stats.postsPublished).toBe(8);
      expect(result.stats.pendingApprovals).toBe(2);
      expect(result.actionItems.length).toBeGreaterThan(0);
    });
  });

  describe('getApprovalQueue', () => {
    it('should return enriched approvals with content previews', async () => {
      const now = new Date();
      mockPrisma.approvalQueue.findMany.mockResolvedValue([
        { id: 'aq-1', entityType: 'content_piece', entityId: 'cp-1', status: 'pending', priority: 'high', createdAt: now },
      ]);
      mockPrisma.contentPiece.findUnique.mockResolvedValue({
        title: 'Test Post', platform: 'linkedin', body: 'Test body', mediaUrl: null,
        brand: { name: 'Synap6ia' },
      });

      const result = await reportingService.getApprovalQueue({ status: 'pending' });

      expect(result).toHaveLength(1);
      expect(result[0].preview).toBeDefined();
      expect(result[0].preview!.type).toBe('content_piece');
    });
  });
});
