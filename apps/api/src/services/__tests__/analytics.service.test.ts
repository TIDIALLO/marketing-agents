import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────
const mockPrisma = {
  contentPiece: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  contentMetrics: {
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
  contentSignal: { count: vi.fn() },
  approvalQueue: { count: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));

const analyticsService = await import('../analytics.service');

describe('analytics.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardData', () => {
    it('should aggregate dashboard data with no filters', async () => {
      mockPrisma.contentPiece.groupBy.mockResolvedValue([
        { status: 'draft', _count: 5 },
        { status: 'published', _count: 10 },
      ]);
      mockPrisma.contentMetrics.aggregate.mockResolvedValue({
        _sum: { impressions: 10000, reach: 8000, engagements: 1000, likes: 500, comments: 200, shares: 100, clicks: 300, videoViews: 50 },
        _avg: { engagementRate: 8.5 },
      });
      mockPrisma.contentSignal.count.mockResolvedValue(3);
      mockPrisma.approvalQueue.count.mockResolvedValue(2);

      const result = await analyticsService.getDashboardData({});

      expect(result.contentByStatus).toHaveLength(2);
      expect(result.metrics.totalImpressions).toBe(10000);
      expect(result.metrics.avgEngagementRate).toBe(8.5);
      expect(result.signalsDetected).toBe(3);
      expect(result.pendingApprovals).toBe(2);
    });

    it('should filter by brandId', async () => {
      mockPrisma.contentPiece.groupBy.mockResolvedValue([]);
      mockPrisma.contentMetrics.aggregate.mockResolvedValue({
        _sum: { impressions: null, reach: null, engagements: null, likes: null, comments: null, shares: null, clicks: null, videoViews: null },
        _avg: { engagementRate: null },
      });
      mockPrisma.contentSignal.count.mockResolvedValue(0);
      mockPrisma.approvalQueue.count.mockResolvedValue(0);

      const result = await analyticsService.getDashboardData({ brandId: 'brand-1' });

      expect(mockPrisma.contentPiece.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ brandId: 'brand-1' }),
        }),
      );
      expect(result.metrics.totalImpressions).toBe(0);
    });

    it('should apply date filter', async () => {
      const from = new Date('2025-01-01');
      const to = new Date('2025-01-31');
      mockPrisma.contentPiece.groupBy.mockResolvedValue([]);
      mockPrisma.contentMetrics.aggregate.mockResolvedValue({
        _sum: { impressions: null, reach: null, engagements: null, likes: null, comments: null, shares: null, clicks: null, videoViews: null },
        _avg: { engagementRate: null },
      });
      mockPrisma.contentSignal.count.mockResolvedValue(0);
      mockPrisma.approvalQueue.count.mockResolvedValue(0);

      await analyticsService.getDashboardData({ from, to });

      expect(mockPrisma.contentMetrics.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            collectedAt: { gte: from, lte: to },
          }),
        }),
      );
    });
  });

  describe('getTopPosts', () => {
    it('should return top published posts by engagement', async () => {
      const posts = [
        { id: 'cp-1', title: 'Best Post', platform: 'linkedin', engagementScore: 95 },
        { id: 'cp-2', title: 'Good Post', platform: 'twitter', engagementScore: 80 },
      ];
      mockPrisma.contentPiece.findMany.mockResolvedValue(posts);

      const result = await analyticsService.getTopPosts({});

      expect(result).toHaveLength(2);
      expect(mockPrisma.contentPiece.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'published' }),
          orderBy: { engagementScore: 'desc' },
          take: 10,
        }),
      );
    });

    it('should respect custom limit', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([]);

      await analyticsService.getTopPosts({ limit: 5 });

      expect(mockPrisma.contentPiece.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe('getTrends', () => {
    it('should aggregate metrics by day', async () => {
      const metricsData = [
        { impressions: 100, engagements: 10, likes: 5, comments: 3, shares: 2, engagementRate: 10, collectedAt: new Date('2025-01-15T10:00:00Z') },
        { impressions: 200, engagements: 20, likes: 10, comments: 5, shares: 3, engagementRate: 10, collectedAt: new Date('2025-01-15T14:00:00Z') },
        { impressions: 150, engagements: 15, likes: 8, comments: 4, shares: 2, engagementRate: 10, collectedAt: new Date('2025-01-16T10:00:00Z') },
      ];
      mockPrisma.contentMetrics.findMany.mockResolvedValue(metricsData);

      const result = await analyticsService.getTrends({
        from: new Date('2025-01-15'),
        to: new Date('2025-01-16'),
      });

      expect(result).toHaveLength(2);
      // First day should aggregate both entries
      expect(result[0].date).toBe('2025-01-15');
      expect(result[0].impressions).toBe(300);
      expect(result[0].engagements).toBe(30);
      // Second day
      expect(result[1].date).toBe('2025-01-16');
      expect(result[1].impressions).toBe(150);
    });

    it('should default to 30 days', async () => {
      mockPrisma.contentMetrics.findMany.mockResolvedValue([]);

      await analyticsService.getTrends({});

      const call = mockPrisma.contentMetrics.findMany.mock.calls[0][0];
      const thirtyDaysAgo = Date.now() - 30 * 24 * 3600_000;
      expect(call.where.collectedAt.gte.getTime()).toBeCloseTo(thirtyDaysAgo, -3);
    });

    it('should return empty array for no metrics', async () => {
      mockPrisma.contentMetrics.findMany.mockResolvedValue([]);

      const result = await analyticsService.getTrends({});

      expect(result).toEqual([]);
    });
  });

  describe('getPieceMetricsHistory', () => {
    it('should return metrics for a specific piece', async () => {
      const metrics = [
        { id: 'cm-1', contentPieceId: 'cp-1', impressions: 100, collectedAt: new Date('2025-01-15') },
        { id: 'cm-2', contentPieceId: 'cp-1', impressions: 200, collectedAt: new Date('2025-01-16') },
      ];
      mockPrisma.contentMetrics.findMany.mockResolvedValue(metrics);

      const result = await analyticsService.getPieceMetricsHistory('cp-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.contentMetrics.findMany).toHaveBeenCalledWith({
        where: { contentPieceId: 'cp-1' },
        orderBy: { collectedAt: 'asc' },
      });
    });
  });
});
