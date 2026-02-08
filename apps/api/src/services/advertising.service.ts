import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { claudeGenerate, dalleGenerate } from '../lib/ai';
import { uploadFromUrl } from '../lib/minio';
import { sendSlackNotification } from '../lib/slack';
import { emitToTenant } from '../lib/socket';
import { triggerWorkflow } from '../lib/n8n';

// ─── Competitive Ad Research (Story 8.1) ─────────────────────

export async function runCompetitorResearch(tenantId: string, brandId: string) {
  // In production: call Facebook Ad Library API for competitor ads
  console.log(`[DEV] Facebook Ad Library not configured — generating mock competitor data`);

  const mockCompetitors = ['Concurrent A', 'Concurrent B'];
  const results = [];

  for (const competitorName of mockCompetitors) {
    const mockAdContent = `[MOCK] Publicité ${competitorName} — Offre promotionnelle ciblant PME`;

    const aiAnalysis = await claudeGenerate(
      `Tu es un analyste publicitaire expert. Analyse cette publicité concurrente et identifie:
- Stratégie utilisée
- Audience ciblée
- Points forts/faibles
- Opportunités pour se différencier
Réponds en 3-4 phrases concises.`,
      `Concurrent: ${competitorName}\nContenu pub: ${mockAdContent}`,
    );

    const ad = await prisma.competitorAd.create({
      data: {
        tenantId,
        brandId,
        platform: 'facebook',
        competitorName,
        adContent: mockAdContent,
        aiAnalysis,
      },
    });

    results.push(ad);
  }

  return results;
}

export async function listCompetitorAds(
  tenantId: string,
  filters?: { brandId?: string; platform?: string },
) {
  return prisma.competitorAd.findMany({
    where: {
      tenantId,
      ...(filters?.brandId ? { brandId: filters.brandId } : {}),
      ...(filters?.platform ? { platform: filters.platform } : {}),
    },
    orderBy: { collectedAt: 'desc' },
    take: 50,
  });
}

// ─── AI Campaign Proposal (Story 8.2) ────────────────────────

export async function generateCampaignProposal(
  tenantId: string,
  data: {
    brandId: string;
    adAccountId: string;
    contentSignalId?: string;
    platform: string;
    objective?: string;
  },
) {
  // Get brand context
  const brand = await prisma.brand.findFirst({
    where: { id: data.brandId, tenantId },
    select: { name: true, brandVoice: true, targetAudience: true },
  });
  if (!brand) throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');

  // Get content signal if provided
  let signalContext = '';
  if (data.contentSignalId) {
    const signal = await prisma.contentSignal.findFirst({
      where: { id: data.contentSignalId },
      include: { contentPiece: { select: { title: true, body: true, platform: true, hashtags: true } } },
    });
    if (signal) {
      signalContext = `\nContenu gagnant source: "${signal.contentPiece.title}" (${signal.contentPiece.platform})
Body: ${signal.contentPiece.body.slice(0, 300)}
Recommandation: ${signal.aiRecommendation}`;
    }
  }

  // Get recent competitor intel
  const recentCompetitors = await prisma.competitorAd.findMany({
    where: { tenantId, brandId: data.brandId },
    orderBy: { collectedAt: 'desc' },
    take: 3,
    select: { competitorName: true, aiAnalysis: true },
  });
  const competitorContext = recentCompetitors
    .map((c) => `${c.competitorName}: ${c.aiAnalysis?.slice(0, 150) ?? ''}`)
    .join('\n');

  // Generate campaign proposal with Claude
  const aiResponse = await claudeGenerate(
    `Tu es un expert en publicité digitale pour PME en Afrique de l'Ouest et France.
Génère une proposition de campagne ${data.platform} complète.

Retourne un JSON:
{
  "name": "nom campagne",
  "objective": "awareness|traffic|leads|conversions",
  "dailyBudget": 15,
  "totalBudget": 450,
  "duration": 30,
  "targeting": { "ageMin": 25, "ageMax": 55, "genders": ["all"], "interests": ["..."], "locations": ["SN", "CI", "FR"], "customAudiences": [] },
  "kpiTargets": { "targetCpc": 0.3, "targetCtr": 2.5, "targetRoas": 3.0 },
  "adSets": [{ "name": "...", "budgetPercent": 50, "targetingVariant": "..." }],
  "creatives": [{ "title": "...", "body": "...", "callToAction": "LEARN_MORE", "imagePrompt": "..." }],
  "reasoning": "pourquoi cette stratégie"
}
Réponds uniquement avec le JSON.`,
    `Marque: ${brand.name}
Voix: ${JSON.stringify(brand.brandVoice ?? 'professionnelle')}
Audience: ${JSON.stringify(brand.targetAudience ?? 'PME')}
Plateforme: ${data.platform}
Objectif: ${data.objective ?? 'à déterminer'}${signalContext}
Contexte concurrentiel:\n${competitorContext || 'Pas de données concurrentielles'}`,
  );

  let proposal: {
    name: string;
    objective: string;
    dailyBudget: number;
    totalBudget: number;
    targeting: Record<string, unknown>;
    kpiTargets: Record<string, unknown>;
    adSets: { name: string; budgetPercent: number }[];
    creatives: { title: string; body: string; callToAction: string; imagePrompt: string }[];
    reasoning: string;
  };
  try {
    proposal = JSON.parse(aiResponse);
  } catch {
    throw new AppError(422, 'UNPROCESSABLE_ENTITY', 'Impossible de générer la proposition de campagne');
  }

  // Create campaign
  const campaign = await prisma.adCampaign.create({
    data: {
      tenantId,
      brandId: data.brandId,
      adAccountId: data.adAccountId,
      contentSignalId: data.contentSignalId ?? null,
      name: proposal.name,
      platform: data.platform,
      objective: proposal.objective || 'traffic',
      dailyBudget: proposal.dailyBudget,
      totalBudget: proposal.totalBudget,
      status: 'draft',
      targeting: proposal.targeting as Prisma.InputJsonValue,
      kpiTargets: proposal.kpiTargets as Prisma.InputJsonValue,
      aiProposal: proposal as unknown as Prisma.InputJsonValue,
    },
  });

  // Create ad sets
  for (const setData of proposal.adSets) {
    await prisma.adSet.create({
      data: {
        campaignId: campaign.id,
        name: setData.name,
        dailyBudget: proposal.dailyBudget * (setData.budgetPercent / 100),
        targeting: proposal.targeting as Prisma.InputJsonValue,
      },
    });
  }

  // Generate creatives with DALL-E
  for (const creativeData of proposal.creatives) {
    let imageUrl = 'https://placehold.co/1200x628/6366f1/white?text=Ad+Creative';

    if (creativeData.imagePrompt) {
      const dalleUrl = await dalleGenerate(
        `${creativeData.imagePrompt}. Style: publicité professionnelle, moderne, ${data.platform}.`,
        { size: '1792x1024' },
      );
      const date = new Date().toISOString().slice(0, 10);
      const objectPath = `${tenantId}/ads/${date}_${campaign.id}_creative.png`;
      imageUrl = await uploadFromUrl(objectPath, dalleUrl);
    }

    await prisma.adCreative.create({
      data: {
        campaignId: campaign.id,
        title: creativeData.title,
        body: creativeData.body,
        imageUrl,
        callToActionType: creativeData.callToAction || 'LEARN_MORE',
      },
    });
  }

  // Trigger approval (Story 8.3)
  triggerWorkflow('mkt-203', {
    campaignId: campaign.id,
    tenantId,
    brandId: data.brandId,
  }).catch((err) => console.error('[n8n] MKT-203 trigger failed:', err));

  return prisma.adCampaign.findFirst({
    where: { id: campaign.id },
    include: { adSets: true, creatives: true },
  });
}

// ─── Campaign Approval Gate (Story 8.3) ──────────────────────

export async function submitCampaignForApproval(tenantId: string, campaignId: string, assigneeId?: string) {
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, tenantId },
    include: { creatives: true },
  });
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Campagne introuvable');

  // Uses existing approval system from Epic 4
  const { submitForApproval } = await import('./approval.service');
  const approval = await submitForApproval(tenantId, 'ad_campaign', campaignId, assigneeId, 'high');

  await prisma.adCampaign.update({
    where: { id: campaignId },
    data: { status: 'pending_approval' },
  });

  return approval;
}

// ─── Campaign Launch (Stories 8.4, 8.5) ──────────────────────

export async function launchCampaign(tenantId: string, campaignId: string) {
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, tenantId, status: 'approved' },
    include: { adSets: true, creatives: true },
  });
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Campagne introuvable ou non approuvée');

  // Platform-specific launch (mock in dev)
  let platformCampaignId: string;

  if (campaign.platform === 'facebook') {
    platformCampaignId = await launchFacebookCampaign(campaign);
  } else if (campaign.platform === 'tiktok') {
    platformCampaignId = await launchTikTokCampaign(campaign);
  } else {
    platformCampaignId = `mock-${campaign.platform}-${Date.now()}`;
  }

  const updated = await prisma.adCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'active',
      platformCampaignId,
      startDate: new Date(),
    },
  });

  // WebSocket notification
  emitToTenant(tenantId, 'campaign:launched', {
    campaignId: campaign.id,
    name: campaign.name,
    platform: campaign.platform,
  });

  await sendSlackNotification({
    text: `Campagne lancée : "${campaign.name}" (${campaign.platform}) — Budget ${campaign.dailyBudget} EUR/jour`,
  });

  return updated;
}

// Facebook Ads API v19 (mock in dev)
async function launchFacebookCampaign(campaign: {
  id: string;
  name: string;
  objective: string;
  adSets: { id: string; name: string }[];
  creatives: { id: string; title: string }[];
}): Promise<string> {
  console.log(`[DEV] Facebook Ads API — launching campaign "${campaign.name}"`);
  console.log(`  Ad sets: ${campaign.adSets.length}, Creatives: ${campaign.creatives.length}`);

  // In production: create campaign → ad sets → upload creatives → ads via Facebook Marketing API v19
  for (const adSet of campaign.adSets) {
    await prisma.adSet.update({
      where: { id: adSet.id },
      data: { platformAdsetId: `fb-adset-${Date.now()}` },
    });
  }
  for (const creative of campaign.creatives) {
    await prisma.adCreative.update({
      where: { id: creative.id },
      data: { platformCreativeId: `fb-creative-${Date.now()}` },
    });
  }

  return `fb-campaign-${Date.now()}`;
}

// TikTok Ads API v1.3 (mock in dev)
async function launchTikTokCampaign(campaign: {
  id: string;
  name: string;
  adSets: { id: string; name: string }[];
  creatives: { id: string; title: string }[];
}): Promise<string> {
  console.log(`[DEV] TikTok Ads API — launching campaign "${campaign.name}"`);

  for (const adSet of campaign.adSets) {
    await prisma.adSet.update({
      where: { id: adSet.id },
      data: { platformAdsetId: `tt-adgroup-${Date.now()}` },
    });
  }
  for (const creative of campaign.creatives) {
    await prisma.adCreative.update({
      where: { id: creative.id },
      data: { platformCreativeId: `tt-ad-${Date.now()}` },
    });
  }

  return `tt-campaign-${Date.now()}`;
}

// ─── Ad Metrics Collection (Story 8.6) ───────────────────────

export async function collectAdMetrics() {
  const activeCampaigns = await prisma.adCampaign.findMany({
    where: { status: 'active', platformCampaignId: { not: null } },
    include: { adSets: true },
  });

  const results: { campaignId: string; collected: boolean }[] = [];

  for (const campaign of activeCampaigns) {
    // Mock metrics collection (in production: call platform APIs)
    console.log(`[DEV] Collecting ad metrics for campaign "${campaign.name}" (${campaign.platform})`);

    const impressions = Math.floor(Math.random() * 10000) + 1000;
    const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01));
    const spend = parseFloat((campaign.dailyBudget * (0.5 + Math.random() * 0.5)).toFixed(2));
    const conversions = Math.floor(clicks * (Math.random() * 0.1));

    const cpc = clicks > 0 ? parseFloat((spend / clicks).toFixed(2)) : 0;
    const cpm = impressions > 0 ? parseFloat(((spend / impressions) * 1000).toFixed(2)) : 0;
    const ctr = impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0;
    const roas = spend > 0 ? parseFloat(((conversions * 50) / spend).toFixed(2)) : 0;

    await prisma.adMetrics.create({
      data: {
        campaignId: campaign.id,
        impressions,
        clicks,
        spend,
        conversions,
        cpc,
        cpm,
        ctr,
        roas,
      },
    });

    // Anomaly detection
    const avgMetrics = await prisma.adMetrics.aggregate({
      where: { campaignId: campaign.id },
      _avg: { cpc: true, roas: true },
    });

    const avgCpc = avgMetrics._avg.cpc ?? 0;
    const avgRoas = avgMetrics._avg.roas ?? 0;

    if (avgCpc > 0 && cpc > avgCpc * 2) {
      await sendSlackNotification({
        text: `Anomalie CPC : "${campaign.name}" — CPC ${cpc} EUR (moyenne ${avgCpc.toFixed(2)} EUR)`,
      });
    }

    if (avgRoas > 0 && roas < avgRoas * 0.5) {
      await sendSlackNotification({
        text: `Anomalie ROAS : "${campaign.name}" — ROAS ${roas} (moyenne ${avgRoas.toFixed(2)})`,
      });
    }

    results.push({ campaignId: campaign.id, collected: true });
  }

  return results;
}

// ─── AI Campaign Optimization (Story 8.7) ────────────────────

export async function optimizeCampaigns(tenantId: string) {
  const activeCampaigns = await prisma.adCampaign.findMany({
    where: { tenantId, status: 'active' },
    include: {
      adSets: true,
      creatives: true,
      metrics: { orderBy: { collectedAt: 'desc' }, take: 14 },
    },
  });

  const optimizations = [];

  for (const campaign of activeCampaigns) {
    if (campaign.metrics.length < 3) continue; // Need at least 3 data points

    const recentMetrics = campaign.metrics.slice(0, 7);
    const avgRoas = recentMetrics.reduce((a, m) => a + m.roas, 0) / recentMetrics.length;
    const avgCpc = recentMetrics.reduce((a, m) => a + m.cpc, 0) / recentMetrics.length;
    const avgCtr = recentMetrics.reduce((a, m) => a + m.ctr, 0) / recentMetrics.length;
    const totalSpend = recentMetrics.reduce((a, m) => a + m.spend, 0);

    // Claude analysis
    const aiResponse = await claudeGenerate(
      `Tu es un expert en optimisation publicitaire. Analyse ces métriques et recommande des actions.

Retourne un JSON:
{
  "actions": [
    { "type": "pause_adset"|"scale_budget"|"adjust_targeting"|"pause_creative", "target": "id", "reason": "...", "value": null }
  ],
  "summary": "résumé des optimisations en 2-3 phrases"
}

Règles:
- ROAS < 1.0 pendant 3 jours → pause ad set
- CPC > 2× moyenne → ajuster ciblage
- CTR > 2× moyenne → scaler budget +30%
Réponds uniquement avec le JSON.`,
      `Campagne: ${campaign.name} (${campaign.platform})
Budget: ${campaign.dailyBudget} EUR/jour
Métriques 7 derniers jours: ROAS moy=${avgRoas.toFixed(2)}, CPC moy=${avgCpc.toFixed(2)}, CTR moy=${avgCtr.toFixed(2)}%, Spend total=${totalSpend.toFixed(2)}
Ad sets: ${campaign.adSets.map((s) => s.name).join(', ')}
Creatives: ${campaign.creatives.length} variantes`,
    );

    let parsed: { actions: { type: string; target: string; reason: string }[]; summary: string };
    try {
      parsed = JSON.parse(aiResponse);
    } catch {
      parsed = { actions: [], summary: aiResponse };
    }

    // Log optimization in AiLearningLog
    await prisma.aiLearningLog.create({
      data: {
        tenantId,
        agentType: 'amplification_engine',
        actionType: 'campaign_optimization',
        entityType: 'ad_campaign',
        entityId: campaign.id,
        input: { avgRoas, avgCpc, avgCtr, totalSpend } as Prisma.InputJsonValue,
        output: parsed as unknown as Prisma.InputJsonValue,
        outcome: parsed.actions.length > 0 ? 'optimized' : 'no_change',
      },
    });

    // Apply actions (mock in dev — in production: call platform APIs)
    for (const action of parsed.actions) {
      console.log(`[DEV] Optimization: ${action.type} — ${action.reason}`);
    }

    optimizations.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      actions: parsed.actions,
      summary: parsed.summary,
    });
  }

  // Send Slack summary
  if (optimizations.length > 0) {
    const summaryText = optimizations
      .map((o) => `*${o.campaignName}*: ${o.summary}`)
      .join('\n');

    await sendSlackNotification({
      text: `Optimisations campagnes : ${optimizations.length} campagne(s) analysée(s)`,
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: 'Optimisations campagnes quotidiennes' } },
        { type: 'section', text: { type: 'mrkdwn', text: summaryText } },
      ],
    });
  }

  return optimizations;
}

// ─── Campaign CRUD ───────────────────────────────────────────

export async function listCampaigns(
  tenantId: string,
  filters?: { brandId?: string; status?: string; platform?: string },
) {
  return prisma.adCampaign.findMany({
    where: {
      tenantId,
      ...(filters?.brandId ? { brandId: filters.brandId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.platform ? { platform: filters.platform } : {}),
    },
    include: {
      _count: { select: { adSets: true, creatives: true, metrics: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCampaignById(tenantId: string, id: string) {
  const campaign = await prisma.adCampaign.findFirst({
    where: { id, tenantId },
    include: { adSets: true, creatives: true, metrics: { orderBy: { collectedAt: 'desc' }, take: 30 } },
  });
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Campagne introuvable');
  return campaign;
}

export async function pauseCampaign(tenantId: string, campaignId: string) {
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, tenantId, status: 'active' },
  });
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Campagne introuvable ou non active');

  // In production: pause via platform API
  console.log(`[DEV] Pausing campaign "${campaign.name}" on ${campaign.platform}`);

  return prisma.adCampaign.update({
    where: { id: campaignId },
    data: { status: 'paused' },
  });
}
