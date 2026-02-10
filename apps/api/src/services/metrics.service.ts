import { prisma } from '../lib/prisma';
import { claudeGenerate } from '../lib/ai';
import { publishEvent } from '../lib/redis';
import { sendSlackNotification } from '../lib/slack';
import { emitEvent } from '../lib/socket';
import { decrypt } from '../lib/encryption';
import { getLinkedInPostStats } from '../lib/linkedin';
import { getTweetMetrics } from '../lib/twitter';

// Engagement score weights (Story 5.3)
const WEIGHTS = {
  likes: 1,
  comments: 3,
  shares: 5,
  saves: 4,
  clicks: 2,
};

// Collection intervals in hours (collect at these ages after publish)
const COLLECTION_INTERVALS = [1, 24, 48, 168]; // 1h, 24h, 48h, 7d

// ─── Metrics Collection (Stories 5.1, 5.2) ───────────────────

export async function collectMetrics() {
  // Find all published content from last 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 3600_000);

  const publishedPieces = await prisma.contentPiece.findMany({
    where: {
      status: 'published',
      publishedAt: { gte: cutoff },
      platformPostId: { not: null },
    },
    include: {
      brand: {
        include: {
          socialAccounts: { where: { status: 'active' } },
        },
      },
      metrics: {
        select: { collectionAge: true },
        orderBy: { collectedAt: 'desc' },
      },
    },
  });

  const results: { pieceId: string; platform: string; collected: boolean; collectionAge?: number }[] = [];

  for (const piece of publishedPieces) {
    // Determine post age in hours
    const postAgeHours = piece.publishedAt
      ? Math.floor((Date.now() - piece.publishedAt.getTime()) / 3600_000)
      : 0;

    // Find the next collection interval we haven't done yet
    const collectedAges = new Set(piece.metrics.map((m) => m.collectionAge).filter(Boolean));
    const nextInterval = COLLECTION_INTERVALS.find(
      (interval) => postAgeHours >= interval && !collectedAges.has(interval),
    );

    // Also collect if no metrics exist yet, or if last collection was >6h ago
    const lastMetric = piece.metrics[0];
    const hoursSinceLastCollection = lastMetric
      ? Math.floor((Date.now() - new Date().getTime()) / 3600_000)
      : Infinity;
    const shouldCollect = nextInterval !== undefined || !lastMetric || hoursSinceLastCollection >= 6;

    if (!shouldCollect) {
      continue;
    }

    const account = piece.brand.socialAccounts.find((a) => a.platform === piece.platform);
    const metrics = await collectPlatformMetrics(
      piece.platform,
      piece.platformPostId!,
      account?.id,
      account?.profileType ?? undefined,
    );

    // Calculate engagement rate
    const engagementRate =
      metrics.impressions > 0
        ? ((metrics.likes + metrics.comments + metrics.shares) / metrics.impressions) * 100
        : 0;

    // Store metrics snapshot with collection age
    await prisma.contentMetrics.create({
      data: {
        contentPieceId: piece.id,
        platform: piece.platform,
        ...metrics,
        engagementRate,
        collectionAge: nextInterval ?? postAgeHours,
      },
    });

    // Update engagement score on piece (Story 5.3)
    const engagementScore =
      metrics.likes * WEIGHTS.likes +
      metrics.comments * WEIGHTS.comments +
      metrics.shares * WEIGHTS.shares +
      metrics.saves * WEIGHTS.saves +
      metrics.clicks * WEIGHTS.clicks;

    await prisma.contentPiece.update({
      where: { id: piece.id },
      data: { engagementScore },
    });

    results.push({ pieceId: piece.id, platform: piece.platform, collected: true, collectionAge: nextInterval ?? postAgeHours });
  }

  return results;
}

// ─── Collect Metrics for a Single Piece ─────────────────────

export async function collectMetricsForPiece(pieceId: string) {
  const piece = await prisma.contentPiece.findFirst({
    where: { id: pieceId, status: 'published', platformPostId: { not: null } },
    include: {
      brand: {
        include: { socialAccounts: { where: { status: 'active' } } },
      },
    },
  });

  if (!piece || !piece.platformPostId) {
    return null;
  }

  const account = piece.brand.socialAccounts.find((a) => a.platform === piece.platform);
  const postAgeHours = piece.publishedAt
    ? Math.floor((Date.now() - piece.publishedAt.getTime()) / 3600_000)
    : 0;

  const metrics = await collectPlatformMetrics(
    piece.platform,
    piece.platformPostId,
    account?.id,
    account?.profileType ?? undefined,
  );

  const engagementRate =
    metrics.impressions > 0
      ? ((metrics.likes + metrics.comments + metrics.shares) / metrics.impressions) * 100
      : 0;

  const stored = await prisma.contentMetrics.create({
    data: {
      contentPieceId: piece.id,
      platform: piece.platform,
      ...metrics,
      engagementRate,
      collectionAge: postAgeHours,
    },
  });

  const engagementScore =
    metrics.likes * WEIGHTS.likes +
    metrics.comments * WEIGHTS.comments +
    metrics.shares * WEIGHTS.shares +
    metrics.saves * WEIGHTS.saves +
    metrics.clicks * WEIGHTS.clicks;

  await prisma.contentPiece.update({
    where: { id: piece.id },
    data: { engagementScore },
  });

  return stored;
}

// Platform-specific metrics collection — real API calls for LinkedIn & Twitter
async function collectPlatformMetrics(
  platform: string,
  platformPostId: string,
  socialAccountId: string | undefined,
  profileType?: string,
): Promise<{
  impressions: number;
  reach: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  videoViews: number;
}> {
  // Get access token if we have a social account
  let accessToken: string | null = null;
  if (socialAccountId) {
    const account = await prisma.socialAccount.findUnique({ where: { id: socialAccountId } });
    if (account?.accessTokenEncrypted) {
      try {
        accessToken = decrypt(account.accessTokenEncrypted);
      } catch {
        console.error(`[Metrics] Failed to decrypt token for account ${socialAccountId}`);
      }
    }
  }

  if (!accessToken) {
    console.log(`[Metrics] No access token for ${platform} account ${socialAccountId} — skipping`);
    return { impressions: 0, reach: 0, engagements: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, videoViews: 0 };
  }

  switch (platform) {
    case 'linkedin': {
      try {
        const stats = await getLinkedInPostStats(accessToken, platformPostId, profileType);
        return {
          impressions: stats.impressions,
          reach: stats.impressions, // LinkedIn doesn't distinguish reach vs impressions for personal
          engagements: stats.engagements,
          likes: stats.likes,
          comments: stats.comments,
          shares: stats.shares,
          saves: 0,
          clicks: stats.clicks,
          videoViews: 0,
        };
      } catch (err) {
        console.error(`[Metrics] LinkedIn fetch failed for ${platformPostId}:`, err);
        return { impressions: 0, reach: 0, engagements: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, videoViews: 0 };
      }
    }

    case 'twitter': {
      try {
        const stats = await getTweetMetrics(accessToken, platformPostId);
        return {
          impressions: stats.impressions,
          reach: stats.impressions,
          engagements: stats.likes + stats.retweets + stats.replies + stats.quotes,
          likes: stats.likes,
          comments: stats.replies,
          shares: stats.retweets + stats.quotes,
          saves: 0,
          clicks: 0,
          videoViews: 0,
        };
      } catch (err) {
        console.error(`[Metrics] Twitter fetch failed for ${platformPostId}:`, err);
        return { impressions: 0, reach: 0, engagements: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, videoViews: 0 };
      }
    }

    default: {
      console.log(`[Metrics] Platform ${platform} not yet supported for metrics collection`);
      return { impressions: 0, reach: 0, engagements: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, videoViews: 0 };
    }
  }
}

// ─── Winning Content Signal Detection (Story 5.4) ────────────

export async function detectWinningContent() {
  // Get metrics from last 7 days
  const cutoff = new Date(Date.now() - 7 * 24 * 3600_000);

  const recentMetrics = await prisma.contentMetrics.findMany({
    where: { collectedAt: { gte: cutoff } },
    include: {
      contentPiece: {
        select: {
          id: true,
          brandId: true,
          title: true,
          body: true,
          platform: true,
          hashtags: true,
          engagementScore: true,
        },
      },
    },
    orderBy: { collectedAt: 'desc' },
  });

  if (recentMetrics.length === 0) return [];

  // Deduplicate: keep latest metric per piece
  const latestByPiece = new Map<string, (typeof recentMetrics)[0]>();
  for (const m of recentMetrics) {
    if (!latestByPiece.has(m.contentPieceId)) {
      latestByPiece.set(m.contentPieceId, m);
    }
  }

  const metricsArr = [...latestByPiece.values()];

  // Calculate threshold: mean + 1.5 * stddev
  const rates = metricsArr.map((m) => m.engagementRate);
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const variance = rates.reduce((a, r) => a + (r - mean) ** 2, 0) / rates.length;
  const stddev = Math.sqrt(variance);
  const threshold = mean + 1.5 * stddev;

  const winners = metricsArr.filter((m) => m.engagementRate > threshold);

  const signals = [];

  for (const winner of winners) {
    const piece = winner.contentPiece;

    // Claude analysis: why is this content winning?
    const aiResponse = await claudeGenerate(
      `Tu es un analyste marketing expert. Analyse pourquoi ce contenu surperforme et recommande une stratégie d'amplification.
Retourne un JSON: { "signalType": "high_engagement"|"viral_potential"|"conversion_driver", "analysis": "pourquoi ça marche", "recommendation": "stratégie d'amplification" }
Réponds uniquement avec le JSON.`,
      `Plateforme: ${piece.platform}
Titre: ${piece.title}
Body: ${piece.body.slice(0, 500)}
Hashtags: ${JSON.stringify(piece.hashtags)}
Engagement rate: ${winner.engagementRate.toFixed(2)}% (seuil: ${threshold.toFixed(2)}%)
Impressions: ${winner.impressions}, Likes: ${winner.likes}, Comments: ${winner.comments}, Shares: ${winner.shares}`,
    );

    let parsed: { signalType: string; analysis: string; recommendation: string };
    try {
      parsed = JSON.parse(aiResponse);
    } catch {
      parsed = {
        signalType: 'high_engagement',
        analysis: aiResponse,
        recommendation: 'Amplifier ce contenu sur les autres plateformes',
      };
    }

    const signalStrength = (winner.engagementRate - threshold) / stddev;

    const signal = await prisma.contentSignal.create({
      data: {
        contentPieceId: piece.id,
        signalType: parsed.signalType || 'high_engagement',
        signalStrength: Math.min(signalStrength, 10),
        aiRecommendation: `${parsed.analysis}\n\n${parsed.recommendation}`,
      },
    });

    // Publish to Redis for inter-agent communication
    await publishEvent('mkt:agent:1:signals', {
      signalId: signal.id,
      contentPieceId: piece.id,
      signalType: signal.signalType,
      signalStrength: signal.signalStrength,
    });

    // Real-time WebSocket notification (Story 5.6)
    emitEvent('content:signal', {
      signalId: signal.id,
      contentPieceId: piece.id,
      title: piece.title,
      platform: piece.platform,
      signalType: signal.signalType,
      signalStrength: signal.signalStrength,
    });

    // Slack notification
    await sendSlackNotification({
      text: `Contenu gagnant détecté : "${piece.title}" (${piece.platform}) — engagement ${winner.engagementRate.toFixed(1)}% (seuil ${threshold.toFixed(1)}%)`,
    });

    signals.push(signal);
  }

  return signals;
}

// ─── List Signals ────────────────────────────────────────────

export async function listSignals(
  filters?: { brandId?: string; signalType?: string },
) {
  return prisma.contentSignal.findMany({
    where: {
      ...(filters?.brandId ? { contentPiece: { brandId: filters.brandId } } : {}),
      ...(filters?.signalType ? { signalType: filters.signalType } : {}),
    },
    include: {
      contentPiece: {
        select: { id: true, title: true, platform: true, engagementScore: true, brandId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
