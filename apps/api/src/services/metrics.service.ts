import { prisma } from '../lib/prisma';
import { claudeGenerate } from '../lib/ai';
import { publishEvent } from '../lib/redis';
import { sendSlackNotification } from '../lib/slack';
import { emitToTenant } from '../lib/socket';

// Engagement score weights (Story 5.3)
const WEIGHTS = {
  likes: 1,
  comments: 3,
  shares: 5,
  saves: 4,
  clicks: 2,
};

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
    },
  });

  const results: { pieceId: string; platform: string; collected: boolean }[] = [];

  for (const piece of publishedPieces) {
    const metrics = await collectPlatformMetrics(
      piece.platform,
      piece.platformPostId!,
      piece.brand.socialAccounts.find((a) => a.platform === piece.platform)?.id,
    );

    // Calculate engagement rate
    const engagementRate =
      metrics.impressions > 0
        ? ((metrics.likes + metrics.comments + metrics.shares) / metrics.impressions) * 100
        : 0;

    // Store metrics snapshot
    await prisma.contentMetrics.create({
      data: {
        contentPieceId: piece.id,
        platform: piece.platform,
        ...metrics,
        engagementRate,
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

    results.push({ pieceId: piece.id, platform: piece.platform, collected: true });
  }

  return results;
}

// Platform-specific metrics collection (mock in dev)
async function collectPlatformMetrics(
  platform: string,
  _platformPostId: string,
  _socialAccountId: string | undefined,
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
  // In production: decrypt tokens, call platform APIs
  // LinkedIn: organizationalEntityShareStatistics
  // Facebook: /{postId}/insights
  // Instagram: /{mediaId}/insights
  // Twitter: /tweets/:id with tweet.fields=public_metrics
  // TikTok: /video/query

  console.log(`[DEV] Collecting ${platform} metrics for post (mock)`);

  // Return mock metrics for development
  const base = Math.floor(Math.random() * 1000);
  return {
    impressions: base + Math.floor(Math.random() * 5000),
    reach: base + Math.floor(Math.random() * 3000),
    engagements: Math.floor(Math.random() * 500),
    likes: Math.floor(Math.random() * 200),
    comments: Math.floor(Math.random() * 50),
    shares: Math.floor(Math.random() * 30),
    saves: Math.floor(Math.random() * 20),
    clicks: Math.floor(Math.random() * 100),
    videoViews: platform === 'tiktok' ? Math.floor(Math.random() * 10000) : 0,
  };
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
          tenantId: true,
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
      tenantId: piece.tenantId,
      signalType: signal.signalType,
      signalStrength: signal.signalStrength,
    });

    // Real-time WebSocket notification (Story 5.6)
    emitToTenant(piece.tenantId, 'content:signal', {
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
  tenantId: string,
  filters?: { brandId?: string; signalType?: string },
) {
  return prisma.contentSignal.findMany({
    where: {
      contentPiece: {
        tenantId,
        ...(filters?.brandId ? { brandId: filters.brandId } : {}),
      },
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
