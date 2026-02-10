import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { claudeGenerate } from '../lib/ai';

// ─── A/B Testing Service (Phase 4.4) ───────────────────────────
// Creates tests, generates variants, collects results, determines winners
// with statistical significance (two-proportion z-test).

// ─── Create A/B Test ────────────────────────────────────────────

export async function createTest(params: {
  name: string;
  entityType: 'content_piece' | 'email_subject' | 'cta' | 'ad_creative';
  controlId: string;
  metric?: string;
}) {
  // Generate variant automatically
  const variant = await generateVariant(params.entityType, params.controlId);

  const test = await prisma.aBTest.create({
    data: {
      name: params.name,
      entityType: params.entityType,
      controlId: params.controlId,
      variantId: variant.variantId,
      metric: params.metric ?? 'engagement_score',
      status: 'running',
    },
  });

  return { test, variant };
}

// ─── Generate Variant ───────────────────────────────────────────

async function generateVariant(
  entityType: string,
  controlId: string,
): Promise<{ variantId: string; changes: string }> {
  if (entityType === 'content_piece') {
    const control = await prisma.contentPiece.findUniqueOrThrow({
      where: { id: controlId },
      include: { brand: { select: { brandVoice: true } } },
    });

    const variantBody = await claudeGenerate(
      `Tu es un copywriter expert en A/B testing. Génère une variante du contenu ci-dessous.
La variante doit avoir le MEME message fondamental mais avec un angle, ton ou accroche différent.
Garde la même longueur approximative. Réponds UNIQUEMENT avec le nouveau texte, sans explication.`,
      `Plateforme: ${control.platform}\nFramework: ${control.framework ?? 'none'}\n\nContenu original:\n${control.body}`,
    );

    const variant = await prisma.contentPiece.create({
      data: {
        brandId: control.brandId,
        contentInputId: control.contentInputId,
        parentId: control.id,
        platform: control.platform,
        title: `[Variant] ${control.title}`,
        body: variantBody,
        hashtags: control.hashtags as Prisma.InputJsonValue,
        callToAction: control.callToAction,
        framework: control.framework,
        status: 'draft',
      },
    });

    return { variantId: variant.id, changes: 'Body rewritten with different angle/hook' };
  }

  if (entityType === 'email_subject') {
    const control = await prisma.emailTemplate.findUniqueOrThrow({
      where: { id: controlId },
    });

    const variantSubject = await claudeGenerate(
      `Génère une variante du sujet d'email ci-dessous pour un A/B test.
Même intention, angle différent. Réponds UNIQUEMENT avec le nouveau sujet.`,
      control.subject,
    );

    const variant = await prisma.emailTemplate.create({
      data: {
        brandId: control.brandId,
        name: `[Variant] ${control.name}`,
        subject: variantSubject.trim(),
        htmlBody: control.htmlBody,
        textBody: control.textBody,
        variables: control.variables as Prisma.InputJsonValue ?? undefined,
      },
    });

    return { variantId: variant.id, changes: `Subject changed: "${control.subject}" → "${variantSubject.trim()}"` };
  }

  if (entityType === 'ad_creative') {
    const control = await prisma.adCreative.findUniqueOrThrow({
      where: { id: controlId },
    });

    const variantTitle = await claudeGenerate(
      `Génère une variante du titre publicitaire ci-dessous pour un A/B test.
Même message, accroche différente. Réponds UNIQUEMENT avec le nouveau titre.`,
      `Titre: ${control.title}\nBody: ${control.body}`,
    );

    const variant = await prisma.adCreative.create({
      data: {
        campaignId: control.campaignId,
        adSetId: control.adSetId,
        title: variantTitle.trim(),
        body: control.body,
        imageUrl: control.imageUrl,
        callToActionType: control.callToActionType,
      },
    });

    return { variantId: variant.id, changes: `Title changed: "${control.title}" → "${variantTitle.trim()}"` };
  }

  throw new Error(`Unsupported entity type: ${entityType}`);
}

// ─── Collect Results ────────────────────────────────────────────

export async function collectResults(testId: string) {
  const test = await prisma.aBTest.findUniqueOrThrow({ where: { id: testId } });

  if (test.status !== 'running') {
    return { test, message: 'Test is not running' };
  }

  let controlViews = 0;
  let controlSuccess = 0;
  let variantViews = 0;
  let variantSuccess = 0;

  if (test.entityType === 'content_piece') {
    const controlMetrics = await prisma.contentMetrics.aggregate({
      where: { contentPieceId: test.controlId },
      _sum: { impressions: true, engagements: true },
    });
    const variantMetrics = await prisma.contentMetrics.aggregate({
      where: { contentPieceId: test.variantId },
      _sum: { impressions: true, engagements: true },
    });

    controlViews = controlMetrics._sum.impressions ?? 0;
    controlSuccess = controlMetrics._sum.engagements ?? 0;
    variantViews = variantMetrics._sum.impressions ?? 0;
    variantSuccess = variantMetrics._sum.engagements ?? 0;
  } else if (test.entityType === 'email_subject') {
    // For email: views = sent, success = opens
    const controlCampaigns = await prisma.emailCampaign.aggregate({
      where: { templateId: test.controlId },
      _sum: { sentCount: true, openCount: true },
    });
    const variantCampaigns = await prisma.emailCampaign.aggregate({
      where: { templateId: test.variantId },
      _sum: { sentCount: true, openCount: true },
    });

    controlViews = controlCampaigns._sum.sentCount ?? 0;
    controlSuccess = controlCampaigns._sum.openCount ?? 0;
    variantViews = variantCampaigns._sum.sentCount ?? 0;
    variantSuccess = variantCampaigns._sum.openCount ?? 0;
  } else if (test.entityType === 'ad_creative') {
    const controlAd = await prisma.adMetrics.aggregate({
      where: { campaignId: test.controlId },
      _sum: { impressions: true, clicks: true },
    });
    const variantAd = await prisma.adMetrics.aggregate({
      where: { campaignId: test.variantId },
      _sum: { impressions: true, clicks: true },
    });

    controlViews = controlAd._sum.impressions ?? 0;
    controlSuccess = controlAd._sum.clicks ?? 0;
    variantViews = variantAd._sum.impressions ?? 0;
    variantSuccess = variantAd._sum.clicks ?? 0;
  }

  const updated = await prisma.aBTest.update({
    where: { id: testId },
    data: { controlViews, controlSuccess, variantViews, variantSuccess },
  });

  return { test: updated };
}

// ─── Determine Winner (Two-Proportion Z-Test) ──────────────────

export async function determineWinner(testId: string, requiredConfidence = 0.95) {
  // Collect latest results first
  await collectResults(testId);

  const test = await prisma.aBTest.findUniqueOrThrow({ where: { id: testId } });

  if (test.status !== 'running') {
    return { test, message: 'Test already concluded' };
  }

  const minSample = 30;
  if (test.controlViews < minSample || test.variantViews < minSample) {
    return {
      test,
      message: `Insufficient data. Need ${minSample} views per variant. Control: ${test.controlViews}, Variant: ${test.variantViews}`,
      ready: false,
    };
  }

  // Two-proportion z-test
  const p1 = test.controlViews > 0 ? test.controlSuccess / test.controlViews : 0;
  const p2 = test.variantViews > 0 ? test.variantSuccess / test.variantViews : 0;
  const pPooled =
    (test.controlSuccess + test.variantSuccess) / (test.controlViews + test.variantViews);

  const se = Math.sqrt(
    pPooled * (1 - pPooled) * (1 / test.controlViews + 1 / test.variantViews),
  );

  const zScore = se > 0 ? (p2 - p1) / se : 0;
  const confidence = zScoreToConfidence(Math.abs(zScore));

  let winner: string | null = null;
  let conclusion: string;

  if (confidence >= requiredConfidence) {
    winner = zScore > 0 ? 'variant' : 'control';
    const uplift = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0;
    conclusion = `${winner === 'variant' ? 'Variant' : 'Control'} wins with ${(confidence * 100).toFixed(1)}% confidence. ` +
      `Control rate: ${(p1 * 100).toFixed(2)}%, Variant rate: ${(p2 * 100).toFixed(2)}% (${uplift > 0 ? '+' : ''}${uplift.toFixed(1)}% uplift)`;
  } else {
    conclusion = `No statistically significant winner yet. Confidence: ${(confidence * 100).toFixed(1)}% (need ${(requiredConfidence * 100).toFixed(0)}%). ` +
      `Control rate: ${(p1 * 100).toFixed(2)}%, Variant rate: ${(p2 * 100).toFixed(2)}%`;
  }

  const updated = await prisma.aBTest.update({
    where: { id: testId },
    data: {
      confidenceLevel: confidence,
      winner,
      conclusion,
      ...(winner ? { status: 'completed', endedAt: new Date() } : {}),
    },
  });

  return { test: updated, ready: true };
}

// ─── List Tests ─────────────────────────────────────────────────

export async function listTests(filters?: { status?: string; entityType?: string }) {
  return prisma.aBTest.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.entityType ? { entityType: filters.entityType } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

// ─── Auto-Evaluate Running Tests ────────────────────────────────

export async function evaluateAllRunningTests() {
  const running = await prisma.aBTest.findMany({
    where: { status: 'running' },
  });

  const results: { testId: string; name: string; winner: string | null; confidence: number | null }[] = [];

  for (const test of running) {
    const result = await determineWinner(test.id);
    results.push({
      testId: test.id,
      name: test.name,
      winner: result.test.winner,
      confidence: result.test.confidenceLevel,
    });
  }

  return { evaluated: results.length, results };
}

// ─── Z-Score to Confidence (CDF approximation) ─────────────────

function zScoreToConfidence(z: number): number {
  // Approximation of normal CDF using Abramowitz and Stegun
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  // Two-tailed: 1 - 2*(1-CDF)
  const cdf = 0.5 * (1.0 + sign * y);
  return 1 - 2 * (1 - cdf);
}
