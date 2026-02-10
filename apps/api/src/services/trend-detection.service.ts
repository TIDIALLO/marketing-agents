import { prisma } from '../lib/prisma';
import { claudeGenerate } from '../lib/ai';
import { publishEvent } from '../lib/redis';

// ─── Trend Detection Service (Phase 4.3) ───────────────────────
// Analyzes hashtag performance, detects rising topics, identifies content fatigue.

// ─── Hashtag Performance Analysis ───────────────────────────────

export async function analyzeHashtagPerformance(days = 30) {
  const since = new Date(Date.now() - days * 24 * 3600_000);

  const pieces = await prisma.contentPiece.findMany({
    where: {
      status: 'published',
      publishedAt: { gte: since },
    },
    select: {
      id: true,
      hashtags: true,
      engagementScore: true,
      platform: true,
      metrics: {
        orderBy: { collectedAt: 'desc' },
        take: 1,
        select: { impressions: true, engagements: true, engagementRate: true },
      },
    },
  });

  const hashtagStats = new Map<
    string,
    { uses: number; totalScore: number; totalImpressions: number; totalEngagements: number; platforms: Set<string> }
  >();

  for (const piece of pieces) {
    const tags = Array.isArray(piece.hashtags) ? (piece.hashtags as string[]) : [];
    const latestMetrics = piece.metrics[0];

    for (const tag of tags) {
      const normalized = tag.toLowerCase().replace(/^#/, '');
      const existing = hashtagStats.get(normalized) ?? {
        uses: 0,
        totalScore: 0,
        totalImpressions: 0,
        totalEngagements: 0,
        platforms: new Set<string>(),
      };
      existing.uses += 1;
      existing.totalScore += piece.engagementScore;
      existing.totalImpressions += latestMetrics?.impressions ?? 0;
      existing.totalEngagements += latestMetrics?.engagements ?? 0;
      existing.platforms.add(piece.platform);
      hashtagStats.set(normalized, existing);
    }
  }

  const ranked = [...hashtagStats.entries()]
    .map(([tag, stats]) => ({
      hashtag: `#${tag}`,
      uses: stats.uses,
      avgEngagementScore: stats.uses > 0 ? stats.totalScore / stats.uses : 0,
      totalImpressions: stats.totalImpressions,
      totalEngagements: stats.totalEngagements,
      platforms: [...stats.platforms],
    }))
    .sort((a, b) => b.avgEngagementScore - a.avgEngagementScore);

  return { period: `${days} days`, hashtagCount: ranked.length, hashtags: ranked };
}

// ─── Rising Topics Detection ────────────────────────────────────

export async function detectRisingTopics() {
  const now = new Date();
  const thisWeek = new Date(now.getTime() - 7 * 24 * 3600_000);
  const lastWeek = new Date(now.getTime() - 14 * 24 * 3600_000);

  // Get this week's content
  const thisWeekPieces = await prisma.contentPiece.findMany({
    where: { status: 'published', publishedAt: { gte: thisWeek } },
    select: { title: true, body: true, hashtags: true, engagementScore: true, platform: true },
  });

  // Get last week's content
  const lastWeekPieces = await prisma.contentPiece.findMany({
    where: { status: 'published', publishedAt: { gte: lastWeek, lt: thisWeek } },
    select: { title: true, body: true, hashtags: true, engagementScore: true, platform: true },
  });

  // Get recent signals (boost opportunities, high performers)
  const recentSignals = await prisma.contentSignal.findMany({
    where: { createdAt: { gte: thisWeek } },
    select: {
      signalType: true,
      signalStrength: true,
      aiRecommendation: true,
      contentPiece: { select: { title: true, platform: true } },
    },
    take: 20,
    orderBy: { signalStrength: 'desc' },
  });

  // Use Claude to detect rising topics
  const analysis = await claudeGenerate(
    `Tu es un analyste de tendances marketing. Analyse les données de contenu sur 2 semaines et identifie :
1. **Sujets montants** : topics qui gagnent en engagement cette semaine vs la précédente
2. **Sujets en déclin** : topics qui perdent en traction
3. **Opportunités** : sujets adjacents non encore couverts mais pertinents
4. **Fatigue de contenu** : sujets trop répétés avec engagement en baisse

Réponds en JSON avec la structure :
{
  "risingTopics": [{ "topic": "...", "confidence": 0-100, "reason": "...", "suggestedAngle": "..." }],
  "decliningTopics": [{ "topic": "...", "dropPercentage": 0-100, "recommendation": "..." }],
  "opportunities": [{ "topic": "...", "relevance": 0-100, "suggestedFormat": "...", "targetPlatform": "..." }],
  "contentFatigue": [{ "topic": "...", "overuseScore": 0-100, "suggestion": "..." }]
}`,
    JSON.stringify({
      thisWeek: thisWeekPieces.map((p) => ({
        title: p.title,
        bodyPreview: p.body.slice(0, 200),
        hashtags: p.hashtags,
        score: p.engagementScore,
        platform: p.platform,
      })),
      lastWeek: lastWeekPieces.map((p) => ({
        title: p.title,
        bodyPreview: p.body.slice(0, 200),
        hashtags: p.hashtags,
        score: p.engagementScore,
        platform: p.platform,
      })),
      signals: recentSignals.map((s) => ({
        type: s.signalType,
        strength: s.signalStrength,
        recommendation: s.aiRecommendation,
        content: s.contentPiece.title,
      })),
    }),
  );

  let parsed: {
    risingTopics: { topic: string; confidence: number; reason: string; suggestedAngle: string }[];
    decliningTopics: { topic: string; dropPercentage: number; recommendation: string }[];
    opportunities: { topic: string; relevance: number; suggestedFormat: string; targetPlatform: string }[];
    contentFatigue: { topic: string; overuseScore: number; suggestion: string }[];
  };

  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { risingTopics: [], decliningTopics: [], opportunities: [], contentFatigue: [] };
  } catch {
    parsed = { risingTopics: [], decliningTopics: [], opportunities: [], contentFatigue: [] };
  }

  // Auto-create content briefs from rising topics and opportunities
  let contentBriefsCreated = 0;
  const brand = await prisma.brand.findFirst();
  const user = await prisma.platformUser.findFirst();

  if (brand && user) {
    const briefTopics = [
      ...parsed.risingTopics.filter((t) => t.confidence >= 70).map((t) => ({
        topic: t.topic,
        angle: t.suggestedAngle,
        type: 'rising_topic' as const,
      })),
      ...parsed.opportunities.filter((o) => o.relevance >= 70).map((o) => ({
        topic: o.topic,
        angle: `${o.suggestedFormat} pour ${o.targetPlatform}`,
        type: 'opportunity' as const,
      })),
    ];

    for (const brief of briefTopics.slice(0, 5)) {
      await prisma.contentInput.create({
        data: {
          brandId: brand.id,
          createdById: user.id,
          inputType: 'auto_trend',
          rawContent: `[Trend ${brief.type}] ${brief.topic}\n\nAngle suggéré : ${brief.angle}`,
          status: 'pending',
        },
      });
      contentBriefsCreated++;
    }
  }

  publishEvent('mkt:agent:learning:updated', {
    source: 'trend_detection',
    risingCount: parsed.risingTopics.length,
    fatigueCount: parsed.contentFatigue.length,
    briefsCreated: contentBriefsCreated,
  });

  return {
    ...parsed,
    contentBriefsCreated,
    analyzedPieces: { thisWeek: thisWeekPieces.length, lastWeek: lastWeekPieces.length },
  };
}

// ─── Content Fatigue Check ──────────────────────────────────────

export async function detectContentFatigue() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000);
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 3600_000);

  // Compare first half vs second half of last 30 days
  const firstHalf = await prisma.contentPiece.findMany({
    where: { status: 'published', publishedAt: { gte: thirtyDaysAgo, lt: fifteenDaysAgo } },
    select: { title: true, hashtags: true, engagementScore: true, framework: true },
  });

  const secondHalf = await prisma.contentPiece.findMany({
    where: { status: 'published', publishedAt: { gte: fifteenDaysAgo } },
    select: { title: true, hashtags: true, engagementScore: true, framework: true },
  });

  // Framework fatigue: compare avg scores
  const frameworkScores = (pieces: typeof firstHalf) => {
    const map = new Map<string, { total: number; count: number }>();
    for (const p of pieces) {
      const fw = p.framework ?? 'none';
      const existing = map.get(fw) ?? { total: 0, count: 0 };
      existing.total += p.engagementScore;
      existing.count += 1;
      map.set(fw, existing);
    }
    return map;
  };

  const firstScores = frameworkScores(firstHalf);
  const secondScores = frameworkScores(secondHalf);

  const fatigueIndicators: { framework: string; firstHalfAvg: number; secondHalfAvg: number; decline: number }[] = [];

  for (const [fw, first] of firstScores) {
    const second = secondScores.get(fw);
    if (!second || first.count < 2 || second.count < 2) continue;
    const firstAvg = first.total / first.count;
    const secondAvg = second.total / second.count;
    if (secondAvg < firstAvg) {
      fatigueIndicators.push({
        framework: fw,
        firstHalfAvg: Math.round(firstAvg * 10) / 10,
        secondHalfAvg: Math.round(secondAvg * 10) / 10,
        decline: Math.round(((firstAvg - secondAvg) / firstAvg) * 100),
      });
    }
  }

  return {
    period: '30 days (15d vs 15d)',
    fatigueIndicators: fatigueIndicators.sort((a, b) => b.decline - a.decline),
    firstHalfPieces: firstHalf.length,
    secondHalfPieces: secondHalf.length,
  };
}
