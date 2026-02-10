import { prisma } from '../lib/prisma';

interface DashboardFilters {
  brandId?: string;
  platform?: string;
  from?: Date;
  to?: Date;
}

// ─── Dashboard Overview (Story 5.5) ──────────────────────────

export async function getDashboardData(filters: DashboardFilters) {
  const dateFilter = {
    ...(filters.from ? { gte: filters.from } : {}),
    ...(filters.to ? { lte: filters.to } : {}),
  };
  const hasDateFilter = filters.from || filters.to;

  const pieceWhere = {
    ...(filters.brandId ? { brandId: filters.brandId } : {}),
    ...(filters.platform ? { platform: filters.platform } : {}),
  };

  // Total content counts by status
  const statusCounts = await prisma.contentPiece.groupBy({
    by: ['status'],
    where: pieceWhere,
    _count: true,
  });

  // Aggregate metrics
  const metricsAggregate = await prisma.contentMetrics.aggregate({
    where: {
      contentPiece: pieceWhere,
      ...(hasDateFilter ? { collectedAt: dateFilter } : {}),
    },
    _sum: {
      impressions: true,
      reach: true,
      engagements: true,
      likes: true,
      comments: true,
      shares: true,
      clicks: true,
      videoViews: true,
    },
    _avg: {
      engagementRate: true,
    },
  });

  // Active signals count
  const signalsCount = await prisma.contentSignal.count({
    where: {
      contentPiece: pieceWhere,
      ...(hasDateFilter ? { createdAt: dateFilter } : {}),
    },
  });

  // Pending approvals
  const pendingApprovals = await prisma.approvalQueue.count({
    where: { status: 'pending' },
  });

  return {
    contentByStatus: statusCounts.map((s) => ({ status: s.status, count: s._count })),
    metrics: {
      totalImpressions: metricsAggregate._sum.impressions ?? 0,
      totalReach: metricsAggregate._sum.reach ?? 0,
      totalEngagements: metricsAggregate._sum.engagements ?? 0,
      totalLikes: metricsAggregate._sum.likes ?? 0,
      totalComments: metricsAggregate._sum.comments ?? 0,
      totalShares: metricsAggregate._sum.shares ?? 0,
      totalClicks: metricsAggregate._sum.clicks ?? 0,
      totalVideoViews: metricsAggregate._sum.videoViews ?? 0,
      avgEngagementRate: metricsAggregate._avg.engagementRate ?? 0,
    },
    signalsDetected: signalsCount,
    pendingApprovals,
  };
}

// ─── Top Posts (Story 5.5) ───────────────────────────────────

export async function getTopPosts(
  filters: DashboardFilters & { limit?: number },
) {
  return prisma.contentPiece.findMany({
    where: {
      status: 'published',
      ...(filters.brandId ? { brandId: filters.brandId } : {}),
      ...(filters.platform ? { platform: filters.platform } : {}),
      ...(filters.from || filters.to
        ? {
            publishedAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      platform: true,
      engagementScore: true,
      publishedAt: true,
      mediaUrl: true,
      brandId: true,
      brand: { select: { name: true } },
      metrics: {
        orderBy: { collectedAt: 'desc' },
        take: 1,
        select: {
          impressions: true,
          reach: true,
          engagements: true,
          likes: true,
          comments: true,
          shares: true,
          engagementRate: true,
        },
      },
    },
    orderBy: { engagementScore: 'desc' },
    take: filters.limit ?? 10,
  });
}

// ─── Engagement Trends (Story 5.5) ───────────────────────────

export async function getTrends(
  filters: DashboardFilters & { days?: number },
) {
  const days = filters.days ?? 30;
  const from = filters.from ?? new Date(Date.now() - days * 24 * 3600_000);
  const to = filters.to ?? new Date();

  // Get daily aggregated metrics
  const metrics = await prisma.contentMetrics.findMany({
    where: {
      contentPiece: {
        ...(filters.brandId ? { brandId: filters.brandId } : {}),
        ...(filters.platform ? { platform: filters.platform } : {}),
      },
      collectedAt: { gte: from, lte: to },
    },
    select: {
      impressions: true,
      engagements: true,
      likes: true,
      comments: true,
      shares: true,
      engagementRate: true,
      collectedAt: true,
    },
    orderBy: { collectedAt: 'asc' },
  });

  // Group by day
  const dailyMap = new Map<
    string,
    { impressions: number; engagements: number; likes: number; comments: number; shares: number; count: number; rateSum: number }
  >();

  for (const m of metrics) {
    const day = m.collectedAt.toISOString().slice(0, 10);
    const existing = dailyMap.get(day) ?? {
      impressions: 0,
      engagements: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      count: 0,
      rateSum: 0,
    };
    existing.impressions += m.impressions;
    existing.engagements += m.engagements;
    existing.likes += m.likes;
    existing.comments += m.comments;
    existing.shares += m.shares;
    existing.count += 1;
    existing.rateSum += m.engagementRate;
    dailyMap.set(day, existing);
  }

  return [...dailyMap.entries()].map(([date, data]) => ({
    date,
    impressions: data.impressions,
    engagements: data.engagements,
    likes: data.likes,
    comments: data.comments,
    shares: data.shares,
    avgEngagementRate: data.count > 0 ? data.rateSum / data.count : 0,
  }));
}

// ─── Metrics History for a Single Piece ──────────────────────

export async function getPieceMetricsHistory(pieceId: string) {
  return prisma.contentMetrics.findMany({
    where: {
      contentPieceId: pieceId,
    },
    orderBy: { collectedAt: 'asc' },
  });
}
