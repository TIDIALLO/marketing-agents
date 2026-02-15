import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { claudeGenerate } from '../lib/ai';
import { publishEvent } from '../lib/redis';
import type { BrandVoiceConfig } from '@mktengine/shared';

// ─── Compound Learning Service (Phase 4.5) ─────────────────────
// Analyzes performance by framework/tone/platform, auto-updates Brand Voice,
// tracks prompt effectiveness, and feeds insights back into the system.

// ─── Performance Analysis by Framework ──────────────────────────

export async function analyzeFrameworkPerformance(days = 60) {
  const since = new Date(Date.now() - days * 24 * 3600_000);

  const pieces = await prisma.contentPiece.findMany({
    where: {
      status: 'published',
      publishedAt: { gte: since },
      framework: { not: null },
    },
    select: {
      framework: true,
      platform: true,
      engagementScore: true,
      metrics: {
        orderBy: { collectedAt: 'desc' },
        take: 1,
        select: { impressions: true, engagements: true, engagementRate: true, shares: true },
      },
    },
  });

  // Group by framework × platform
  const matrix = new Map<string, {
    count: number;
    totalScore: number;
    totalImpressions: number;
    totalEngagements: number;
    totalShares: number;
    rateSum: number;
  }>();

  for (const piece of pieces) {
    const key = `${piece.framework}|${piece.platform}`;
    const m = piece.metrics[0];
    const existing = matrix.get(key) ?? {
      count: 0, totalScore: 0, totalImpressions: 0, totalEngagements: 0, totalShares: 0, rateSum: 0,
    };
    existing.count += 1;
    existing.totalScore += piece.engagementScore;
    existing.totalImpressions += m?.impressions ?? 0;
    existing.totalEngagements += m?.engagements ?? 0;
    existing.totalShares += m?.shares ?? 0;
    existing.rateSum += m?.engagementRate ?? 0;
    matrix.set(key, existing);
  }

  const rankings = [...matrix.entries()]
    .map(([key, data]) => {
      const [framework, platform] = key.split('|');
      return {
        framework,
        platform,
        count: data.count,
        avgScore: data.count > 0 ? Math.round((data.totalScore / data.count) * 10) / 10 : 0,
        avgEngagementRate: data.count > 0 ? Math.round((data.rateSum / data.count) * 100) / 100 : 0,
        totalImpressions: data.totalImpressions,
        totalShares: data.totalShares,
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  return { period: `${days} days`, totalPieces: pieces.length, rankings };
}

// ─── Posting Time Analysis ──────────────────────────────────────

export async function analyzePostingTimes(days = 60) {
  const since = new Date(Date.now() - days * 24 * 3600_000);

  const pieces = await prisma.contentPiece.findMany({
    where: {
      status: 'published',
      publishedAt: { gte: since },
    },
    select: {
      publishedAt: true,
      platform: true,
      engagementScore: true,
    },
  });

  // Group by platform × dayOfWeek × hour
  const timeSlots = new Map<string, { count: number; totalScore: number }>();

  for (const piece of pieces) {
    if (!piece.publishedAt) continue;
    const day = piece.publishedAt.getUTCDay();
    const hour = piece.publishedAt.getUTCHours();
    const key = `${piece.platform}|${day}|${hour}`;
    const existing = timeSlots.get(key) ?? { count: 0, totalScore: 0 };
    existing.count += 1;
    existing.totalScore += piece.engagementScore;
    timeSlots.set(key, existing);
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const bestTimes = [...timeSlots.entries()]
    .map(([key, data]) => {
      const parts = key.split('|');
      const platform = parts[0];
      const day = parts[1] ?? '0';
      const hour = parts[2] ?? '0';
      return {
        platform,
        day: dayNames[parseInt(day)],
        hour: parseInt(hour),
        count: data.count,
        avgScore: data.count > 0 ? Math.round((data.totalScore / data.count) * 10) / 10 : 0,
      };
    })
    .filter((t) => t.count >= 2)
    .sort((a, b) => b.avgScore - a.avgScore);

  return { period: `${days} days`, bestTimes: bestTimes.slice(0, 10) };
}

// ─── Auto-Update Brand Voice ────────────────────────────────────

export async function autoUpdateBrandVoice(brandId: string) {
  const brand = await prisma.brand.findUniqueOrThrow({
    where: { id: brandId },
    select: { id: true, brandVoice: true },
  });

  const currentVoice = brand.brandVoice as BrandVoiceConfig | null;
  if (!currentVoice) {
    return { updated: false, reason: 'No brand voice configured' };
  }

  // Get framework performance
  const frameworkPerf = await analyzeFrameworkPerformance(60);

  // Get top-performing content
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000);
  const topPieces = await prisma.contentPiece.findMany({
    where: {
      brandId,
      status: 'published',
      publishedAt: { gte: thirtyDaysAgo },
      engagementScore: { gte: 50 },
    },
    select: { title: true, body: true, framework: true, platform: true, engagementScore: true },
    orderBy: { engagementScore: 'desc' },
    take: 10,
  });

  // Get worst performers to learn what to avoid
  const worstPieces = await prisma.contentPiece.findMany({
    where: {
      brandId,
      status: 'published',
      publishedAt: { gte: thirtyDaysAgo },
      engagementScore: { lt: 20 },
    },
    select: { title: true, body: true, framework: true, platform: true, engagementScore: true },
    orderBy: { engagementScore: 'asc' },
    take: 5,
  });

  // Get best posting times
  const timingData = await analyzePostingTimes(60);

  // Ask Claude to recommend voice adjustments
  const recommendations = await claudeGenerate(
    `Tu es un stratège en brand voice. Analyse les données de performance et suggère des ajustements à la Brand Voice.

Brand Voice actuelle:
${JSON.stringify(currentVoice, null, 2)}

Règles:
- Ne change PAS la persona (c'est l'identité de la marque)
- Tu peux suggérer des ajustements aux: tone, vocabulary, frameworks, languageStyle, platformOverrides, examples
- Base tes recommandations UNIQUEMENT sur les données de performance
- Sois conservateur: ne change que ce qui est clairement supporté par les données

Réponds en JSON:
{
  "adjustments": {
    "tone": ["ajout1"] | null,
    "vocabulary": { "addPreferred": [], "addAvoided": [] } | null,
    "frameworks": ["ordered_by_performance"] | null,
    "languageStyle": { "key": "newValue" } | null,
    "platformOverrides": { "platform": { "key": "value" } } | null,
    "newGoodExamples": [] | null,
    "newBadExamples": [] | null
  },
  "reasoning": "...",
  "confidenceScore": 0-100
}`,
    JSON.stringify({
      frameworkRankings: frameworkPerf.rankings.slice(0, 10),
      topContent: topPieces.map((p) => ({
        title: p.title,
        bodyPreview: p.body.slice(0, 150),
        framework: p.framework,
        platform: p.platform,
        score: p.engagementScore,
      })),
      lowContent: worstPieces.map((p) => ({
        title: p.title,
        bodyPreview: p.body.slice(0, 150),
        framework: p.framework,
        platform: p.platform,
        score: p.engagementScore,
      })),
      bestTimes: timingData.bestTimes.slice(0, 5),
    }),
  );

  let parsed: {
    adjustments: {
      tone?: string[] | null;
      vocabulary?: { addPreferred?: string[]; addAvoided?: string[] } | null;
      frameworks?: string[] | null;
      languageStyle?: Record<string, string> | null;
      platformOverrides?: Record<string, Record<string, unknown>> | null;
      newGoodExamples?: string[] | null;
      newBadExamples?: string[] | null;
    };
    reasoning: string;
    confidenceScore: number;
  };

  try {
    const jsonMatch = recommendations.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { adjustments: {}, reasoning: 'parse error', confidenceScore: 0 };
  } catch {
    return { updated: false, reason: 'Failed to parse Claude recommendations' };
  }

  // Only apply if confidence is high enough
  if (parsed.confidenceScore < 60) {
    // Log but don't apply
    await prisma.aiLearningLog.create({
      data: {
        agentType: 'compound_learning',
        actionType: 'voice_recommendation_low_confidence',
        entityType: 'brand',
        entityId: brandId,
        input: { frameworkPerf: frameworkPerf.rankings.slice(0, 5), topCount: topPieces.length },
        output: parsed as unknown as Prisma.InputJsonValue,
        outcome: 'skipped',
      },
    });
    return { updated: false, reason: `Confidence too low: ${parsed.confidenceScore}%`, recommendations: parsed };
  }

  // Apply adjustments
  const updatedVoice: BrandVoiceConfig = { ...currentVoice };

  if (parsed.adjustments.frameworks && parsed.adjustments.frameworks.length > 0) {
    updatedVoice.frameworks = parsed.adjustments.frameworks;
  }

  if (parsed.adjustments.vocabulary) {
    if (parsed.adjustments.vocabulary.addPreferred) {
      const newPreferred = new Set([...updatedVoice.vocabulary.preferred, ...parsed.adjustments.vocabulary.addPreferred]);
      updatedVoice.vocabulary.preferred = [...newPreferred];
    }
    if (parsed.adjustments.vocabulary.addAvoided) {
      const newAvoided = new Set([...updatedVoice.vocabulary.avoided, ...parsed.adjustments.vocabulary.addAvoided]);
      updatedVoice.vocabulary.avoided = [...newAvoided];
    }
  }

  if (parsed.adjustments.newGoodExamples) {
    updatedVoice.examples.good = [
      ...updatedVoice.examples.good,
      ...parsed.adjustments.newGoodExamples,
    ].slice(-10); // Keep last 10
  }

  if (parsed.adjustments.newBadExamples) {
    updatedVoice.examples.bad = [
      ...updatedVoice.examples.bad,
      ...parsed.adjustments.newBadExamples,
    ].slice(-10);
  }

  if (parsed.adjustments.platformOverrides) {
    updatedVoice.platformOverrides = {
      ...updatedVoice.platformOverrides,
      ...parsed.adjustments.platformOverrides,
    } as BrandVoiceConfig['platformOverrides'];
  }

  await prisma.brand.update({
    where: { id: brandId },
    data: { brandVoice: updatedVoice as unknown as Prisma.InputJsonValue },
  });

  await prisma.aiLearningLog.create({
    data: {
      agentType: 'compound_learning',
      actionType: 'voice_auto_updated',
      entityType: 'brand',
      entityId: brandId,
      input: { previous: currentVoice } as unknown as Prisma.InputJsonValue,
      output: { updated: updatedVoice, reasoning: parsed.reasoning } as unknown as Prisma.InputJsonValue,
      outcome: 'applied',
    },
  });

  publishEvent('mkt:agent:learning:updated', {
    source: 'compound_learning',
    action: 'brand_voice_updated',
    brandId,
    confidence: parsed.confidenceScore,
  });

  return {
    updated: true,
    reasoning: parsed.reasoning,
    confidence: parsed.confidenceScore,
    changes: parsed.adjustments,
  };
}

// ─── Prompt Effectiveness Tracking ──────────────────────────────

export async function trackPromptEffectiveness(days = 30) {
  const since = new Date(Date.now() - days * 24 * 3600_000);

  // Content generation actions from AI learning log
  const actions = await prisma.aiLearningLog.findMany({
    where: {
      createdAt: { gte: since },
      agentType: { in: ['content_flywheel', 'opportunity_hunter', 'amplification_engine'] },
    },
    select: {
      agentType: true,
      actionType: true,
      outcome: true,
      createdAt: true,
    },
  });

  // Group by agent → action → outcome
  const effectiveness = new Map<string, Map<string, { total: number; success: number }>>();

  for (const action of actions) {
    const agentMap = effectiveness.get(action.agentType) ?? new Map();
    const stats = agentMap.get(action.actionType) ?? { total: 0, success: 0 };
    stats.total += 1;
    if (action.outcome && !['skipped', 'failed', 'error'].includes(action.outcome)) {
      stats.success += 1;
    }
    agentMap.set(action.actionType, stats);
    effectiveness.set(action.agentType, agentMap);
  }

  const report = [...effectiveness.entries()].map(([agent, actions]) => ({
    agent,
    actions: [...actions.entries()].map(([action, stats]) => ({
      action,
      total: stats.total,
      successRate: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0,
    })),
  }));

  return { period: `${days} days`, totalActions: actions.length, agents: report };
}

// ─── Full Compound Learning Cycle ───────────────────────────────

export async function runCompoundLearningCycle() {
  const brand = await prisma.brand.findFirst();
  if (!brand) {
    return { error: 'No brand found' };
  }

  const [frameworkPerf, timingPerf, voiceUpdate, promptEff] = await Promise.all([
    analyzeFrameworkPerformance(60),
    analyzePostingTimes(60),
    autoUpdateBrandVoice(brand.id),
    trackPromptEffectiveness(30),
  ]);

  // Log cycle completion
  await prisma.aiLearningLog.create({
    data: {
      agentType: 'compound_learning',
      actionType: 'cycle_completed',
      entityType: 'system',
      entityId: `cycle_${Date.now()}`,
      input: {
        frameworkCount: frameworkPerf.rankings.length,
        timingSlots: timingPerf.bestTimes.length,
        voiceUpdated: voiceUpdate.updated,
        agentCount: promptEff.agents.length,
      } as Prisma.InputJsonValue,
      output: {
        topFramework: frameworkPerf.rankings[0] ?? null,
        bestTime: timingPerf.bestTimes[0] ?? null,
        voiceConfidence: voiceUpdate.updated ? (voiceUpdate as { confidence: number }).confidence : null,
        totalActions: promptEff.totalActions,
      } as Prisma.InputJsonValue,
      outcome: 'completed',
    },
  });

  publishEvent('mkt:agent:learning:updated', {
    source: 'compound_learning',
    action: 'cycle_completed',
    summary: {
      topFramework: frameworkPerf.rankings[0]?.framework ?? 'none',
      voiceUpdated: voiceUpdate.updated,
      totalActions: promptEff.totalActions,
    },
  });

  return {
    frameworkAnalysis: frameworkPerf,
    timingAnalysis: timingPerf,
    brandVoiceUpdate: voiceUpdate,
    promptEffectiveness: promptEff,
  };
}
