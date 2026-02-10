import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { claudeGenerate } from '../lib/ai';
import { sendSlackNotification } from '../lib/slack';
import { publishEvent } from '../lib/redis';
import { emitEvent } from '../lib/socket';

// ─── Organic ↔ Paid Signal Cross-Referencing ────────────────
// Detects winning organic content that should be boosted,
// and tracks how paid campaigns drive organic engagement.

// ─── 3.4a: Organic → Paid (Content Boost Detection) ─────────

export async function detectBoostOpportunities() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600_000);

  // Find high-performing organic content not yet boosted
  const winningContent = await prisma.contentPiece.findMany({
    where: {
      status: 'published',
      publishedAt: { gte: sevenDaysAgo },
      engagementScore: { gte: 70 },
      // Not already linked to an ad campaign
      signals: {
        none: {
          adCampaigns: { some: {} },
        },
      },
    },
    include: {
      brand: { select: { id: true, name: true } },
      metrics: {
        orderBy: { collectedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { engagementScore: 'desc' },
    take: 10,
  });

  if (winningContent.length === 0) {
    return { opportunities: 0, signals: [] };
  }

  const opportunities = [];

  for (const piece of winningContent) {
    const metrics = piece.metrics[0];
    if (!metrics) continue;

    // Calculate boost score based on organic performance
    const engagementRate = metrics.impressions > 0
      ? (metrics.engagements / metrics.impressions) * 100
      : 0;

    const boostScore = calculateBoostScore({
      engagementScore: piece.engagementScore ?? 0,
      engagementRate,
      impressions: metrics.impressions,
      shares: metrics.shares,
    });

    if (boostScore < 60) continue;

    // Claude recommends budget and targeting
    const aiResponse = await claudeGenerate(
      `Tu es un expert en social media advertising. Ce contenu organique performe très bien.
Recommande un boost (publicité payante) pour amplifier sa portée.

Retourne un JSON:
{
  "shouldBoost": true|false,
  "suggestedBudget": 15,
  "suggestedDuration": 7,
  "targetingTips": "conseils ciblage",
  "reasoning": "pourquoi booster"
}
Réponds uniquement avec le JSON.`,
      `Contenu: "${piece.title}"
Plateforme: ${piece.platform}
Score engagement: ${piece.engagementScore}/100
Impressions: ${metrics.impressions}
Engagements: ${metrics.engagements}
Partages: ${metrics.shares}
Taux engagement: ${engagementRate.toFixed(1)}%
Score boost calculé: ${boostScore}/100`,
    );

    let recommendation: {
      shouldBoost: boolean;
      suggestedBudget: number;
      suggestedDuration: number;
      targetingTips: string;
      reasoning: string;
    };
    try {
      recommendation = JSON.parse(aiResponse);
    } catch {
      recommendation = {
        shouldBoost: boostScore >= 70,
        suggestedBudget: 15,
        suggestedDuration: 7,
        targetingTips: '',
        reasoning: aiResponse,
      };
    }

    if (!recommendation.shouldBoost) continue;

    // Create or update a ContentSignal for boost
    const signal = await prisma.contentSignal.upsert({
      where: {
        contentPieceId_signalType: {
          contentPieceId: piece.id,
          signalType: 'boost_opportunity',
        },
      },
      update: {
        signalStrength: boostScore,
        aiRecommendation: recommendation.reasoning,
      },
      create: {
        contentPieceId: piece.id,
        signalType: 'boost_opportunity',
        signalStrength: boostScore,
        aiRecommendation: recommendation.reasoning,
      },
    });

    opportunities.push({
      signalId: signal.id,
      pieceId: piece.id,
      title: piece.title,
      platform: piece.platform,
      boostScore,
      suggestedBudget: recommendation.suggestedBudget,
      suggestedDuration: recommendation.suggestedDuration,
      reasoning: recommendation.reasoning,
    });
  }

  // Notify about opportunities
  if (opportunities.length > 0) {
    emitEvent('signals:boost_opportunities', { count: opportunities.length });

    await sendSlackNotification({
      text: `Signal Cross-Ref: ${opportunities.length} contenus organiques à booster`,
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: 'Opportunités de boost organique → payant' } },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: opportunities.map((o) =>
              `*${o.title}* (${o.platform}) — Score: ${o.boostScore}/100 — Budget suggéré: ${o.suggestedBudget} EUR/j`,
            ).join('\n'),
          },
        },
      ],
    });
  }

  return { opportunities: opportunities.length, signals: opportunities };
}

function calculateBoostScore(params: {
  engagementScore: number;
  engagementRate: number;
  impressions: number;
  shares: number;
}): number {
  let score = 0;

  // Engagement score weight (40%)
  score += (params.engagementScore / 100) * 40;

  // Engagement rate weight (25%)
  score += Math.min(params.engagementRate / 5, 1) * 25;

  // Impression velocity (20%) — higher impressions = already validated
  const impressionScore = Math.min(params.impressions / 5000, 1);
  score += impressionScore * 20;

  // Share virality (15%) — shares indicate content worth amplifying
  const shareScore = Math.min(params.shares / 20, 1);
  score += shareScore * 15;

  return Math.round(score);
}

// ─── 3.4b: Paid → Organic Attribution Tracking ──────────────

export async function trackPaidToOrganicAttribution() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000);

  // Get active ad campaigns with their source content
  const campaigns = await prisma.adCampaign.findMany({
    where: {
      status: { in: ['active', 'completed'] },
      contentSignalId: { not: null },
      createdAt: { gte: thirtyDaysAgo },
    },
    include: {
      metrics: { orderBy: { collectedAt: 'desc' }, take: 7 },
      contentSignal: {
        include: {
          contentPiece: {
            include: {
              metrics: { orderBy: { collectedAt: 'desc' }, take: 7 },
            },
          },
        },
      },
    },
  });

  const attributions = [];

  for (const campaign of campaigns) {
    if (!campaign.contentSignal?.contentPiece) continue;

    const piece = campaign.contentSignal.contentPiece;
    const adMetrics = campaign.metrics;
    const organicMetrics = piece.metrics;

    if (adMetrics.length === 0 || organicMetrics.length === 0) continue;

    // Compare organic performance before and during paid campaign
    const adSpend = adMetrics.reduce((a, m) => a + m.spend, 0);
    const adImpressions = adMetrics.reduce((a, m) => a + m.impressions, 0);
    const organicImpressions = organicMetrics.reduce((a, m) => a + m.impressions, 0);
    const organicEngagements = organicMetrics.reduce((a, m) => a + m.engagements, 0);

    const attribution = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      contentPieceId: piece.id,
      contentTitle: piece.title,
      adSpend,
      adImpressions,
      organicImpressions,
      organicEngagements,
      totalReach: adImpressions + organicImpressions,
      synergy: organicImpressions > 0 && adImpressions > 0
        ? parseFloat(((organicEngagements / organicImpressions) * 100).toFixed(2))
        : 0,
    };

    attributions.push(attribution);
  }

  // Claude analysis of cross-channel patterns
  if (attributions.length > 0) {
    const aiResponse = await claudeGenerate(
      `Tu es un analyste marketing cross-canal. Analyse la corrélation entre campagnes payantes et performance organique.
Retourne un JSON:
{
  "patterns": [{ "description": "...", "recommendation": "..." }],
  "summary": "résumé 2-3 phrases"
}
Réponds uniquement avec le JSON.`,
      `Attributions:\n${JSON.stringify(attributions, null, 2)}`,
    );

    let parsed: { patterns: { description: string; recommendation: string }[]; summary: string };
    try {
      parsed = JSON.parse(aiResponse);
    } catch {
      parsed = { patterns: [], summary: aiResponse };
    }

    // Store insights
    await prisma.aiLearningLog.create({
      data: {
        agentType: 'amplification_engine',
        actionType: 'signal_crossref',
        entityType: 'attribution',
        entityId: `crossref_${Date.now()}`,
        input: { campaigns: attributions.length } as Prisma.InputJsonValue,
        output: parsed as unknown as Prisma.InputJsonValue,
        outcome: `patterns:${parsed.patterns.length}`,
      },
    });

    await publishEvent('mkt:agent:2:crossref', {
      attributions: attributions.length,
      patterns: parsed.patterns.length,
      summary: parsed.summary,
    });
  }

  return { attributions };
}

// ─── Combined Cross-Reference Run ───────────────────────────

export async function runSignalCrossReference() {
  const [boostResult, attributionResult] = await Promise.all([
    detectBoostOpportunities(),
    trackPaidToOrganicAttribution(),
  ]);

  return {
    boostOpportunities: boostResult.opportunities,
    attributions: attributionResult.attributions.length,
    signals: boostResult.signals,
  };
}
