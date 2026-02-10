import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { claudeGenerate } from '../lib/ai';
import { publishEvent } from '../lib/redis';
import { sendSlackNotification } from '../lib/slack';
import { publishPersistentMessage } from './agent-bus.service';

// ─── Story 10.3: Content → Amplification Feedback Loop ──────────
// When a winning content signal is detected, auto-generate ad campaign proposal

export async function amplifyWinningContent(signalId: string) {
  const signal = await prisma.contentSignal.findUnique({
    where: { id: signalId },
    include: {
      contentPiece: {
        include: {
          brand: {
            include: {
              socialAccounts: {
                include: { adAccounts: { where: { status: 'active' }, take: 1 } },
              },
            },
          },
        },
      },
    },
  });

  if (!signal) return null;

  const piece = signal.contentPiece;
  const adAccount = piece.brand.socialAccounts
    .flatMap((sa) => sa.adAccounts)
    .find((a) => a.platform === 'facebook' || a.platform === 'tiktok');

  if (!adAccount) {
    console.log(`[Feedback] No active ad account for brand ${piece.brandId} — skipping amplification`);
    return null;
  }

  // Import and call campaign proposal service
  const { generateCampaignProposal } = await import('./advertising.service');
  const campaign = await generateCampaignProposal({
    brandId: piece.brandId,
    adAccountId: adAccount.id,
    contentSignalId: signal.id,
    platform: adAccount.platform as 'facebook' | 'tiktok' | 'google',
    objective: 'traffic',
  });

  if (!campaign) return null;

  // Publish traceability event
  await publishPersistentMessage('mkt:agent:2:amplification', {
    signalId: signal.id,
    contentPieceId: piece.id,
    campaignId: campaign.id,
    action: 'auto_campaign_proposal',
  });

  await sendSlackNotification({
    text: `Amplification auto : contenu gagnant "${piece.title}" → campagne "${campaign.name}" proposée`,
  });

  return { signalId: signal.id, campaignId: campaign.id };
}

// ─── Story 10.4: Amplification → Leads Feedback Loop ────────────
// Enhanced lead ingestion with full ad attribution

export interface AdAttributionData {
  campaignId?: string;
  adSetId?: string;
  creativeId?: string;
  contentSignalId?: string;
  adPlatform?: string;
}

export async function ingestAdLead(
  leadData: {
    brandId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
    gdprConsent?: boolean;
  },
  attribution: AdAttributionData,
) {
  const { ingestLead } = await import('./lead.service');

  const lead = await ingestLead({
    ...leadData,
    source: 'ad',
    sourceDetail: attribution.adPlatform ?? 'facebook',
    utmSource: attribution.adPlatform,
    utmMedium: 'paid',
    utmCampaign: attribution.campaignId,
  });

  // Publish with full attribution for traceability
  await publishPersistentMessage('mkt:agent:3:ad_lead', {
    leadId: lead.id,
    ...attribution,
    action: 'ad_lead_ingestion',
  });

  return lead;
}

// ─── Story 10.5: Leads → Content Feedback Loops ─────────────────
// Analyze conversion patterns and create content inputs from pain points

export async function analyzeConversionPatterns() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000);

  // Get recent conversions
  const conversions = await prisma.lead.findMany({
    where: {
      convertedAt: { gte: thirtyDaysAgo },
    },
    include: {
      interactions: {
        where: { direction: 'inbound' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  // Get recent pain points from interactions
  const painPointInteractions = await prisma.leadInteraction.findMany({
    where: {
      aiIntent: { in: ['objection', 'pain_point', 'question'] },
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { content: true, aiIntent: true, aiSentiment: true },
    take: 50,
    orderBy: { createdAt: 'desc' },
  });

  if (conversions.length === 0 && painPointInteractions.length === 0) {
    return { insights: 0, contentInputsCreated: 0 };
  }

  // Claude analysis
  const aiResponse = await claudeGenerate(
    `Tu es un stratège marketing expert. Analyse les patterns de conversion et les pain points pour recommander des sujets de contenu.
Retourne un JSON:
{
  "patterns": [
    { "type": "conversion_pattern"|"pain_point"|"faq", "description": "description", "confidence": 0.8, "suggestedContent": "titre de contenu suggéré" }
  ]
}
Limite à 5 patterns max. Réponds uniquement avec le JSON.`,
    `Conversions récentes (${conversions.length}):
${conversions.slice(0, 10).map((c) => `- ${c.firstName} ${c.lastName} (${c.company ?? 'N/A'}) — Source: ${c.source}, Score: ${c.score}`).join('\n')}

Pain points détectés (${painPointInteractions.length}):
${painPointInteractions.slice(0, 15).map((p) => `- [${p.aiIntent}] ${p.content.slice(0, 200)}`).join('\n')}`,
  );

  let parsed: { patterns: { type: string; description: string; confidence: number; suggestedContent: string }[] };
  try {
    parsed = JSON.parse(aiResponse);
  } catch {
    parsed = { patterns: [] };
  }

  let contentInputsCreated = 0;

  // Create ContentInput entries for high-confidence patterns
  const brands = await prisma.brand.findMany({
    select: { id: true },
    take: 1,
  });

  const brandId = brands[0]?.id;

  if (brandId) {
    for (const pattern of parsed.patterns) {
      if (pattern.confidence >= 0.6 && pattern.suggestedContent) {
        await prisma.contentInput.create({
          data: {
            brandId,
            createdById: 'system',
            inputType: 'auto_insight',
            rawContent: `[Auto-generated from ${pattern.type}]\n${pattern.description}\n\nSujet suggéré: ${pattern.suggestedContent}`,
            aiSummary: pattern.description,
            status: 'pending',
          },
        });
        contentInputsCreated++;
      }
    }
  }

  // Store insights in AiLearningLog
  for (const pattern of parsed.patterns) {
    await prisma.aiLearningLog.create({
      data: {
        agentType: 'agent_3',
        actionType: 'conversion_analysis',
        entityType: 'insight',
        entityId: `pattern_${Date.now()}`,
        input: { conversions: conversions.length, painPoints: painPointInteractions.length } as Prisma.InputJsonValue,
        output: pattern as unknown as Prisma.InputJsonValue,
        outcome: `confidence:${pattern.confidence}`,
      },
    });
  }

  // Publish insights
  await publishPersistentMessage('mkt:agent:3:insights', {
    patterns: parsed.patterns.length,
    contentInputsCreated,
    action: 'conversion_analysis',
  });

  return { insights: parsed.patterns.length, contentInputsCreated };
}

// ─── Story 10.6: AI Learning Loop (MKT-404) ─────────────────────
// 30-day data analysis, pattern identification, embeddings

export async function runLearningLoop() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000);

  // Gather 30 days of data
  const [contentPerf, adPerf, leadData, previousInsights] = await Promise.all([
    prisma.contentPiece.findMany({
      where: { publishedAt: { gte: thirtyDaysAgo } },
      select: {
        id: true, title: true, platform: true, engagementScore: true, status: true,
        hashtags: true,
        metrics: { orderBy: { collectedAt: 'desc' }, take: 1 },
      },
      orderBy: { engagementScore: 'desc' },
      take: 50,
    }),
    prisma.adCampaign.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: {
        id: true, name: true, platform: true, objective: true, status: true,
        metrics: { orderBy: { collectedAt: 'desc' }, take: 1 },
      },
      take: 20,
    }),
    prisma.lead.groupBy({
      by: ['source', 'temperature'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: true,
      _avg: { score: true },
    }),
    prisma.aiLearningLog.findMany({
      where: { actionType: 'learning_loop', createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const context = JSON.stringify({
    contentPerformance: contentPerf.map((c) => ({
      title: c.title, platform: c.platform, engagementScore: c.engagementScore,
      impressions: c.metrics[0]?.impressions ?? 0,
      engagements: c.metrics[0]?.engagements ?? 0,
    })),
    adPerformance: adPerf.map((a) => ({
      name: a.name, platform: a.platform, objective: a.objective, status: a.status,
      roas: a.metrics[0]?.roas ?? 0, spend: a.metrics[0]?.spend ?? 0,
    })),
    leadPipeline: leadData.map((l) => ({
      source: l.source, temperature: l.temperature, count: l._count, avgScore: l._avg.score,
    })),
    previousInsights: previousInsights.map((i) => ({
      output: i.output, outcome: i.outcome, createdAt: i.createdAt,
    })),
  });

  const aiResponse = await claudeGenerate(
    `Tu es un analyste marketing IA avancé. Analyse 30 jours de données et identifie des patterns stratégiques.

Pour chaque pattern, fournis:
- type: "content_strategy"|"audience_targeting"|"channel_optimization"|"timing"|"creative"|"budget_allocation"
- description: explication claire
- confidence: 0-1
- action: recommandation actionnable
- validates/invalidates: IDs d'insights précédents confirmés ou infirmés

Retourne un JSON:
{
  "patterns": [
    { "type": "...", "description": "...", "confidence": 0.85, "action": "...", "validatesInsights": [], "invalidatesInsights": [] }
  ],
  "summary": "résumé en 2-3 phrases"
}
Limite à 8 patterns max. Réponds uniquement avec le JSON.`,
    context,
  );

  let parsed: {
    patterns: { type: string; description: string; confidence: number; action: string; validatesInsights?: string[]; invalidatesInsights?: string[] }[];
    summary: string;
  };
  try {
    parsed = JSON.parse(aiResponse);
  } catch {
    parsed = { patterns: [], summary: aiResponse };
  }

  // Generate embeddings for each insight (mock in dev)
  const insights: { id: string; type: string }[] = [];

  for (const pattern of parsed.patterns) {
    const embedding = await generateEmbedding(`${pattern.type}: ${pattern.description} — ${pattern.action}`);

    const log = await prisma.aiLearningLog.create({
      data: {
        agentType: 'system',
        actionType: 'learning_loop',
        entityType: 'pattern',
        entityId: `learning_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        input: { period: '30d', contentCount: contentPerf.length, adCount: adPerf.length } as Prisma.InputJsonValue,
        output: pattern as unknown as Prisma.InputJsonValue,
        outcome: `confidence:${pattern.confidence}`,
        embedding: embedding as Prisma.InputJsonValue,
      },
    });

    insights.push({ id: log.id, type: pattern.type });
  }

  // Notify all agents via Redis
  await publishEvent('mkt:agent:learning:updated', {
    insightCount: insights.length,
    insightIds: insights.map((i) => i.id),
    summary: parsed.summary,
  });

  await sendSlackNotification({
    text: `AI Learning Loop : ${insights.length} patterns identifiés\n${parsed.summary}`,
  });

  return { patterns: insights.length, summary: parsed.summary };
}

// ─── Story 10.7: Ads → Content Performance Feedback ──────────────
// Extract winning ad creative insights and feed into content guidelines

export async function extractAdCreativeInsights() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000);

  // Find top-performing ad creatives by CTR/ROAS
  const topCampaigns = await prisma.adCampaign.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    include: {
      creatives: true,
      metrics: { orderBy: { collectedAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Sort by ROAS and get top performers
  const ranked = topCampaigns
    .filter((c) => c.metrics.length > 0)
    .sort((a, b) => (b.metrics[0]?.roas ?? 0) - (a.metrics[0]?.roas ?? 0))
    .slice(0, 5);

  if (ranked.length === 0) {
    return { insights: 0 };
  }

  const context = ranked.map((c) => ({
    campaign: c.name,
    platform: c.platform,
    roas: c.metrics[0]?.roas ?? 0,
    ctr: c.metrics[0]?.ctr ?? 0,
    creatives: c.creatives.map((cr) => ({
      title: cr.title,
      body: cr.body.slice(0, 200),
      cta: cr.callToActionType,
    })),
  }));

  const aiResponse = await claudeGenerate(
    `Tu es un expert en copywriting et creative ads. Analyse les créatives publicitaires les plus performantes et extrais des insights pour la création de contenu organique.

Retourne un JSON:
{
  "insights": [
    { "category": "messaging"|"visual"|"cta"|"tone"|"format", "insight": "description de l'insight", "applicability": "comment l'appliquer au contenu organique" }
  ]
}
Limite à 5 insights. Réponds uniquement avec le JSON.`,
    `Top créatives publicitaires (par ROAS):\n${JSON.stringify(context, null, 2)}`,
  );

  let parsed: { insights: { category: string; insight: string; applicability: string }[] };
  try {
    parsed = JSON.parse(aiResponse);
  } catch {
    parsed = { insights: [] };
  }

  // Store insights for content generation context
  for (const insight of parsed.insights) {
    await prisma.aiLearningLog.create({
      data: {
        agentType: 'agent_2',
        actionType: 'ad_creative_insight',
        entityType: 'creative_insight',
        entityId: `creative_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        input: { topCampaigns: ranked.length } as Prisma.InputJsonValue,
        output: insight as unknown as Prisma.InputJsonValue,
        outcome: 'active',
      },
    });
  }

  // 3.5: Auto-create ContentInput entries from winning ad patterns
  let contentInputsCreated = 0;
  const brand = await prisma.brand.findFirst({ select: { id: true } });

  if (brand && parsed.insights.length > 0) {
    // Group insights by category to create focused content briefs
    const byCategory: Record<string, typeof parsed.insights> = {};
    for (const insight of parsed.insights) {
      if (!byCategory[insight.category]) byCategory[insight.category] = [];
      byCategory[insight.category].push(insight);
    }

    for (const [category, categoryInsights] of Object.entries(byCategory)) {
      // Generate a content brief from winning ad patterns
      const briefResponse = await claudeGenerate(
        `Tu es un content strategist. À partir des insights des meilleures publicités, crée un brief de contenu organique.
Retourne un JSON:
{
  "title": "titre du contenu organique",
  "format": "linkedin-post|twitter-thread|carousel|article",
  "angle": "angle d'approche inspiré des pubs gagnantes",
  "keyMessages": ["msg1", "msg2", "msg3"]
}
Réponds uniquement avec le JSON.`,
        `Insights publicitaires (catégorie: ${category}):\n${categoryInsights.map((i) => `- ${i.insight}\n  Application: ${i.applicability}`).join('\n')}

Top créatives source:\n${JSON.stringify(context.slice(0, 3), null, 2)}`,
      );

      let brief: { title: string; format: string; angle: string; keyMessages: string[] };
      try {
        brief = JSON.parse(briefResponse);
      } catch {
        continue;
      }

      await prisma.contentInput.create({
        data: {
          brandId: brand.id,
          createdById: 'system',
          inputType: 'auto_insight',
          rawContent: `[Ad Creative → Content | ${category}]
Titre: ${brief.title}
Format: ${brief.format}
Angle: ${brief.angle}
Messages clés:
${brief.keyMessages.map((m) => `- ${m}`).join('\n')}

Source: Top ${ranked.length} campagnes pub (ROAS: ${ranked.map((r) => r.metrics[0]?.roas?.toFixed(1) ?? '?').join(', ')})`,
          aiSummary: `Contenu inspiré pub gagnante (${category}): ${brief.title}`,
          status: 'pending',
        },
      });
      contentInputsCreated++;
    }
  }

  // Publish for Agent 1 (Content Flywheel)
  await publishPersistentMessage('mkt:agent:2:performance', {
    insightCount: parsed.insights.length,
    contentInputsCreated,
    insights: parsed.insights,
    action: 'ad_creative_to_content',
  });

  await sendSlackNotification({
    text: `Ad → Content Loop : ${parsed.insights.length} insights extraits, ${contentInputsCreated} briefs de contenu créés`,
  });

  return { insights: parsed.insights.length, contentInputsCreated };
}

// ─── Objection → Content Feedback Loop ──────────────────────────
// Categorize lead objections and auto-create targeted content briefs

const OBJECTION_CATEGORIES = {
  price: {
    label: 'Prix / Budget',
    contentAngles: [
      'ROI et retour sur investissement concret',
      'Comparaison coût vs. ne rien faire',
      'Témoignages clients avec chiffres',
      'Plans tarifaires et options flexibles',
    ],
  },
  trust: {
    label: 'Confiance / Crédibilité',
    contentAngles: [
      'Études de cas détaillées',
      'Certifications et partenariats',
      'Coulisses de l\'équipe et de la tech',
      'Témoignages vidéo clients',
    ],
  },
  feature: {
    label: 'Fonctionnalités manquantes',
    contentAngles: [
      'Tutoriels et démonstrations de fonctionnalités',
      'Roadmap produit et vision',
      'Intégrations et extensibilité',
      'Comparatifs avec alternatives',
    ],
  },
  timing: {
    label: 'Timing / Pas prêt',
    contentAngles: [
      'Contenu éducatif sur le problème',
      'Tendances du marché et urgence',
      'Guide de préparation au changement',
      'Newsletter périodique avec valeur ajoutée',
    ],
  },
} as const;

export async function analyzeObjectionsAndCreateBriefs() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000);

  // Fetch objection interactions
  const objections = await prisma.leadInteraction.findMany({
    where: {
      aiIntent: 'objection',
      direction: 'inbound',
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { content: true, aiSentiment: true, createdAt: true, leadId: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  if (objections.length === 0) {
    return { categories: {}, contentBriefsCreated: 0 };
  }

  // Ask Claude to categorize all objections
  const aiResponse = await claudeGenerate(
    `Tu es un stratège marketing B2B. Analyse ces objections de leads et catégorise-les.

Catégories possibles: price, trust, feature, timing

Pour chaque catégorie trouvée, fournis:
- Le nombre d'occurrences
- Les objections les plus fréquentes (max 3 par catégorie)
- Un brief de contenu ciblé pour adresser ces objections

Retourne un JSON:
{
  "categories": {
    "price": { "count": 5, "topObjections": ["trop cher", "pas de budget"], "contentBrief": { "title": "titre du contenu", "angle": "angle d'attaque", "format": "article|video|infographic|case-study", "targetPlatform": "linkedin|twitter|blog", "keyMessages": ["msg1", "msg2"] } },
    ...
  },
  "overallInsight": "résumé en 1-2 phrases"
}
Réponds uniquement avec le JSON.`,
    `Objections des 30 derniers jours (${objections.length}):\n${objections.map((o) => `- [${o.aiSentiment ?? 'N/A'}] ${o.content.slice(0, 300)}`).join('\n')}`,
  );

  let parsed: {
    categories: Record<string, {
      count: number;
      topObjections: string[];
      contentBrief: {
        title: string;
        angle: string;
        format: string;
        targetPlatform: string;
        keyMessages: string[];
      };
    }>;
    overallInsight: string;
  };
  try {
    parsed = JSON.parse(aiResponse);
  } catch {
    parsed = { categories: {}, overallInsight: aiResponse };
  }

  let contentBriefsCreated = 0;

  // Get brand for content input creation
  const brand = await prisma.brand.findFirst({ select: { id: true } });
  if (!brand) return { categories: parsed.categories, contentBriefsCreated: 0 };

  // Create ContentInput entries from categorized objections
  for (const [category, data] of Object.entries(parsed.categories)) {
    if (!data.contentBrief) continue;

    const categoryInfo = OBJECTION_CATEGORIES[category as keyof typeof OBJECTION_CATEGORIES];
    const brief = data.contentBrief;

    await prisma.contentInput.create({
      data: {
        brandId: brand.id,
        createdById: 'system',
        inputType: 'auto_insight',
        rawContent: `[Objection Feedback Loop — ${categoryInfo?.label ?? category}]
Nombre d'objections: ${data.count}
Top objections: ${data.topObjections.join(', ')}

Titre suggéré: ${brief.title}
Angle: ${brief.angle}
Format: ${brief.format}
Plateforme cible: ${brief.targetPlatform}
Messages clés:
${brief.keyMessages.map((m) => `- ${m}`).join('\n')}

Angles de contenu recommandés:
${(categoryInfo?.contentAngles ?? []).map((a) => `- ${a}`).join('\n')}`,
        aiSummary: `Contenu anti-objection (${categoryInfo?.label ?? category}): ${brief.title}`,
        status: 'pending',
      },
    });
    contentBriefsCreated++;
  }

  // Log to AiLearningLog
  await prisma.aiLearningLog.create({
    data: {
      agentType: 'agent_3',
      actionType: 'objection_analysis',
      entityType: 'objection_brief',
      entityId: `objection_${Date.now()}`,
      input: { objectionCount: objections.length } as Prisma.InputJsonValue,
      output: parsed as unknown as Prisma.InputJsonValue,
      outcome: `briefs_created:${contentBriefsCreated}`,
    },
  });

  // Publish for Agent 1 (Content Flywheel)
  await publishPersistentMessage('mkt:agent:3:objection_briefs', {
    categories: Object.keys(parsed.categories),
    contentBriefsCreated,
    overallInsight: parsed.overallInsight,
    action: 'objection_to_content',
  });

  // Slack notification
  if (contentBriefsCreated > 0) {
    await sendSlackNotification({
      text: `Objection → Content : ${contentBriefsCreated} briefs créés à partir de ${objections.length} objections\n${parsed.overallInsight}`,
    });
  }

  return { categories: parsed.categories, contentBriefsCreated };
}

// ─── OpenAI Embeddings (mock in dev) ─────────────────────────────

async function generateEmbedding(text: string): Promise<number[]> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

  if (!OPENAI_API_KEY) {
    console.log('[DEV] OpenAI not configured — returning mock embedding');
    // Return a deterministic mock 1536-dim vector
    return Array.from({ length: 1536 }, (_, i) => Math.sin(i * 0.01 + text.length * 0.1));
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    console.error(`[OpenAI] Embedding error: ${response.status}`);
    return [];
  }

  const data = await response.json() as { data?: { embedding?: number[] }[] };
  return data.data?.[0]?.embedding ?? [];
}
