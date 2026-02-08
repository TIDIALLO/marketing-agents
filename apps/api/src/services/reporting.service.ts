import { prisma } from '../lib/prisma';
import { claudeGenerate } from '../lib/ai';
import { sendSlackNotification } from '../lib/slack';


// ─── Daily Analytics Aggregation (Story 9.2 — MKT-402) ──────────

export async function aggregateDailyAnalytics(dateStr?: string) {
  const date = dateStr ? new Date(dateStr) : new Date();
  // Normalize to start of day UTC
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000);

  const organizations = await prisma.organization.findMany({
    select: { id: true, tenantId: true },
  });

  const results: { organizationId: string; created: boolean }[] = [];

  for (const org of organizations) {
    // Count contents published that day
    const contentsPublished = await prisma.contentPiece.count({
      where: {
        tenantId: org.tenantId,
        status: 'published',
        publishedAt: { gte: dayStart, lt: dayEnd },
      },
    });

    // Aggregate content metrics collected that day
    const metricsAgg = await prisma.contentMetrics.aggregate({
      where: {
        contentPiece: { tenantId: org.tenantId },
        collectedAt: { gte: dayStart, lt: dayEnd },
      },
      _sum: { impressions: true, engagements: true },
      _avg: { engagementRate: true },
    });

    // Ad spend that day
    const adMetricsAgg = await prisma.adMetrics.aggregate({
      where: {
        campaign: { tenantId: org.tenantId },
        collectedAt: { gte: dayStart, lt: dayEnd },
      },
      _sum: { spend: true },
    });

    // Leads generated that day
    const leadsGenerated = await prisma.lead.count({
      where: {
        tenantId: org.tenantId,
        createdAt: { gte: dayStart, lt: dayEnd },
      },
    });

    // Leads qualified (scored) that day
    const leadsQualified = await prisma.lead.count({
      where: {
        tenantId: org.tenantId,
        temperature: { in: ['hot', 'warm'] },
        updatedAt: { gte: dayStart, lt: dayEnd },
      },
    });

    // Conversions that day
    const conversions = await prisma.lead.count({
      where: {
        tenantId: org.tenantId,
        convertedAt: { gte: dayStart, lt: dayEnd },
      },
    });

    // Upsert daily analytics
    await prisma.dailyAnalytics.upsert({
      where: { organizationId_date: { organizationId: org.id, date: dayStart } },
      create: {
        tenantId: org.tenantId,
        organizationId: org.id,
        date: dayStart,
        contentsPublished,
        impressions: metricsAgg._sum.impressions ?? 0,
        engagements: metricsAgg._sum.engagements ?? 0,
        avgEngagementRate: metricsAgg._avg.engagementRate ?? 0,
        adSpend: adMetricsAgg._sum.spend ?? 0,
        leadsGenerated,
        leadsQualified,
        conversions,
      },
      update: {
        contentsPublished,
        impressions: metricsAgg._sum.impressions ?? 0,
        engagements: metricsAgg._sum.engagements ?? 0,
        avgEngagementRate: metricsAgg._avg.engagementRate ?? 0,
        adSpend: adMetricsAgg._sum.spend ?? 0,
        leadsGenerated,
        leadsQualified,
        conversions,
      },
    });

    results.push({ organizationId: org.id, created: true });
  }

  return { date: dayStart.toISOString().slice(0, 10), aggregated: results.length };
}

// ─── KPI Streaming Data (Story 9.1) ─────────────────────────────

export async function getStreamingKPIs(tenantId: string) {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 3600_000);

  // Contents published in last 24h
  const contentsPublished24h = await prisma.contentPiece.count({
    where: {
      tenantId,
      status: 'published',
      publishedAt: { gte: last24h },
    },
  });

  // Total engagement (all time, latest metrics per piece)
  const engagementAgg = await prisma.contentMetrics.aggregate({
    where: { contentPiece: { tenantId } },
    _sum: { engagements: true, impressions: true },
  });

  // Leads generated last 24h
  const leadsGenerated24h = await prisma.lead.count({
    where: { tenantId, createdAt: { gte: last24h } },
  });

  // Average ROAS across active campaigns
  const roasAgg = await prisma.adMetrics.aggregate({
    where: { campaign: { tenantId, status: 'active' } },
    _avg: { roas: true },
  });

  // Pending approvals
  const pendingApprovals = await prisma.approvalQueue.count({
    where: { tenantId, status: 'pending' },
  });

  return {
    contentsPublished24h,
    totalEngagements: engagementAgg._sum.engagements ?? 0,
    totalImpressions: engagementAgg._sum.impressions ?? 0,
    leadsGenerated24h,
    avgROAS: Math.round((roasAgg._avg.roas ?? 0) * 100) / 100,
    pendingApprovals,
    timestamp: now.toISOString(),
  };
}

// ─── Weekly AI Report (Story 9.3 — MKT-403) ─────────────────────

export async function generateWeeklyReport(tenantId: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000);
  const weekStart = new Date(Date.UTC(weekAgo.getUTCFullYear(), weekAgo.getUTCMonth(), weekAgo.getUTCDate()));

  // Get daily analytics for the last 7 days
  const dailyData = await prisma.dailyAnalytics.findMany({
    where: {
      tenantId,
      date: { gte: weekStart },
    },
    orderBy: { date: 'asc' },
  });

  // Top 3 content pieces
  const topContent = await prisma.contentPiece.findMany({
    where: {
      tenantId,
      status: 'published',
      publishedAt: { gte: weekStart },
    },
    orderBy: { engagementScore: 'desc' },
    take: 3,
    select: {
      title: true,
      platform: true,
      engagementScore: true,
      brand: { select: { name: true } },
    },
  });

  // Ad performance summary
  const adSummary = await prisma.adMetrics.aggregate({
    where: {
      campaign: { tenantId },
      collectedAt: { gte: weekStart },
    },
    _sum: { spend: true, conversions: true, impressions: true, clicks: true },
    _avg: { roas: true, ctr: true },
  });

  // Lead pipeline
  const newLeads = await prisma.lead.count({
    where: { tenantId, createdAt: { gte: weekStart } },
  });
  const qualifiedLeads = await prisma.lead.count({
    where: { tenantId, temperature: { in: ['hot', 'warm'] }, updatedAt: { gte: weekStart } },
  });
  const convertedLeads = await prisma.lead.count({
    where: { tenantId, convertedAt: { gte: weekStart } },
  });

  // Build context for Claude
  const weeklyTotals = dailyData.reduce(
    (acc, d) => ({
      contentsPublished: acc.contentsPublished + d.contentsPublished,
      impressions: acc.impressions + d.impressions,
      engagements: acc.engagements + d.engagements,
      adSpend: acc.adSpend + d.adSpend,
      leads: acc.leads + d.leadsGenerated,
      conversions: acc.conversions + d.conversions,
    }),
    { contentsPublished: 0, impressions: 0, engagements: 0, adSpend: 0, leads: 0, conversions: 0 },
  );

  const context = JSON.stringify({
    period: { from: weekStart.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) },
    weeklyTotals,
    dailyBreakdown: dailyData.map((d) => ({
      date: d.date.toISOString().slice(0, 10),
      contentsPublished: d.contentsPublished,
      impressions: d.impressions,
      engagements: d.engagements,
      adSpend: d.adSpend,
    })),
    topContent: topContent.map((c) => ({
      title: c.title,
      platform: c.platform,
      brand: c.brand.name,
      engagementScore: c.engagementScore,
    })),
    adPerformance: {
      totalSpend: adSummary._sum.spend ?? 0,
      totalConversions: adSummary._sum.conversions ?? 0,
      avgROAS: adSummary._avg.roas ?? 0,
      avgCTR: adSummary._avg.ctr ?? 0,
    },
    leadPipeline: { newLeads, qualifiedLeads, convertedLeads },
  });

  const report = await claudeGenerate(
    `Tu es un analyste marketing senior. Génère un rapport hebdomadaire structuré en français.
Le rapport doit contenir :
1. Résumé exécutif (3 phrases max)
2. Performance contenu (top 3, tendances)
3. Performance publicitaire (ROAS, meilleur ad set)
4. Pipeline leads (nouveaux, qualifiés, convertis)
5. Insights IA (patterns détectés)
6. Recommandations pour la semaine à venir

Sois concis, actionnable et data-driven.`,
    `Voici les données de la semaine :\n${context}`,
  );

  // Send report via email to owners/admins
  const recipients = await prisma.platformUser.findMany({
    where: { tenantId, role: { in: ['owner', 'admin'] } },
    select: { email: true },
  });

  const { sendWeeklyReportEmail } = await import('../lib/email');
  for (const user of recipients) {
    await sendWeeklyReportEmail(user.email, {
      period: `${weekStart.toISOString().slice(0, 10)} → ${now.toISOString().slice(0, 10)}`,
      report,
    });
  }

  // Post summary in Slack
  await sendSlackNotification({
    text: `Rapport hebdomadaire marketing disponible (${weekStart.toISOString().slice(0, 10)} → ${now.toISOString().slice(0, 10)})`,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: 'Rapport Hebdomadaire Marketing' } },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: report.length > 2000 ? report.slice(0, 2000) + '...' : report,
        },
      },
    ],
  });

  return { period: `${weekStart.toISOString().slice(0, 10)} → ${now.toISOString().slice(0, 10)}`, report, recipientCount: recipients.length };
}

// ─── Approval Queue with Preview (Story 9.4) ────────────────────

export async function getApprovalQueue(
  tenantId: string,
  filters?: { status?: string; entityType?: string },
) {
  const approvals = await prisma.approvalQueue.findMany({
    where: {
      tenantId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.entityType ? { entityType: filters.entityType } : {}),
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  // Enrich with entity previews
  const enriched = await Promise.all(
    approvals.map(async (approval) => {
      let preview: Record<string, unknown> | null = null;

      if (approval.entityType === 'content_piece') {
        const piece = await prisma.contentPiece.findUnique({
          where: { id: approval.entityId },
          select: {
            title: true,
            platform: true,
            body: true,
            mediaUrl: true,
            brand: { select: { name: true } },
          },
        });
        if (piece) {
          preview = {
            type: 'content_piece',
            title: piece.title,
            platform: piece.platform,
            brandName: piece.brand.name,
            bodyPreview: piece.body.slice(0, 200),
            mediaUrl: piece.mediaUrl,
          };
        }
      } else if (approval.entityType === 'ad_campaign') {
        const campaign = await prisma.adCampaign.findUnique({
          where: { id: approval.entityId },
          select: {
            name: true,
            platform: true,
            objective: true,
            dailyBudget: true,
            totalBudget: true,
          },
        });
        if (campaign) {
          preview = {
            type: 'ad_campaign',
            name: campaign.name,
            platform: campaign.platform,
            objective: campaign.objective,
            dailyBudget: campaign.dailyBudget,
            totalBudget: campaign.totalBudget,
          };
        }
      }

      return {
        ...approval,
        preview,
        hoursWaiting: Math.round((Date.now() - approval.createdAt.getTime()) / 3600_000),
      };
    }),
  );

  return enriched;
}
