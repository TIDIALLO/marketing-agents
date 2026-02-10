import { prisma } from '../lib/prisma';
import { claudeGenerate } from '../lib/ai';
import { sendSlackNotification } from '../lib/slack';


// ─── Daily Analytics Aggregation (Story 9.2 — MKT-402) ──────────

export async function aggregateDailyAnalytics(dateStr?: string) {
  const date = dateStr ? new Date(dateStr) : new Date();
  // Normalize to start of day UTC
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000);

  const brands = await prisma.brand.findMany({
    select: { id: true },
  });

  const results: { brandId: string; created: boolean }[] = [];

  for (const brand of brands) {
    // Count contents published that day
    const contentsPublished = await prisma.contentPiece.count({
      where: {
        brandId: brand.id,
        status: 'published',
        publishedAt: { gte: dayStart, lt: dayEnd },
      },
    });

    // Aggregate content metrics collected that day
    const metricsAgg = await prisma.contentMetrics.aggregate({
      where: {
        contentPiece: { brandId: brand.id },
        collectedAt: { gte: dayStart, lt: dayEnd },
      },
      _sum: { impressions: true, engagements: true },
      _avg: { engagementRate: true },
    });

    // Ad spend that day
    const adMetricsAgg = await prisma.adMetrics.aggregate({
      where: {
        campaign: { brandId: brand.id },
        collectedAt: { gte: dayStart, lt: dayEnd },
      },
      _sum: { spend: true },
    });

    // Leads generated that day
    const leadsGenerated = await prisma.lead.count({
      where: {
        brandId: brand.id,
        createdAt: { gte: dayStart, lt: dayEnd },
      },
    });

    // Leads qualified (scored) that day
    const leadsQualified = await prisma.lead.count({
      where: {
        brandId: brand.id,
        temperature: { in: ['hot', 'warm'] },
        updatedAt: { gte: dayStart, lt: dayEnd },
      },
    });

    // Conversions that day
    const conversions = await prisma.lead.count({
      where: {
        brandId: brand.id,
        convertedAt: { gte: dayStart, lt: dayEnd },
      },
    });

    // Upsert daily analytics
    await prisma.dailyAnalytics.upsert({
      where: { brandId_date: { brandId: brand.id, date: dayStart } },
      create: {
        brandId: brand.id,
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

    results.push({ brandId: brand.id, created: true });
  }

  return { date: dayStart.toISOString().slice(0, 10), aggregated: results.length };
}

// ─── KPI Streaming Data (Story 9.1) ─────────────────────────────

export async function getStreamingKPIs() {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 3600_000);

  // Contents published in last 24h
  const contentsPublished24h = await prisma.contentPiece.count({
    where: {
      status: 'published',
      publishedAt: { gte: last24h },
    },
  });

  // Total engagement (all time, latest metrics per piece)
  const engagementAgg = await prisma.contentMetrics.aggregate({
    _sum: { engagements: true, impressions: true },
  });

  // Leads generated last 24h
  const leadsGenerated24h = await prisma.lead.count({
    where: { createdAt: { gte: last24h } },
  });

  // Average ROAS across active campaigns
  const roasAgg = await prisma.adMetrics.aggregate({
    where: { campaign: { status: 'active' } },
    _avg: { roas: true },
  });

  // Pending approvals
  const pendingApprovals = await prisma.approvalQueue.count({
    where: { status: 'pending' },
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

export async function generateWeeklyReport() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000);
  const weekStart = new Date(Date.UTC(weekAgo.getUTCFullYear(), weekAgo.getUTCMonth(), weekAgo.getUTCDate()));

  // Get daily analytics for the last 7 days
  const dailyData = await prisma.dailyAnalytics.findMany({
    where: {
      date: { gte: weekStart },
    },
    orderBy: { date: 'asc' },
  });

  // Top 3 content pieces
  const topContent = await prisma.contentPiece.findMany({
    where: {
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
      collectedAt: { gte: weekStart },
    },
    _sum: { spend: true, conversions: true, impressions: true, clicks: true },
    _avg: { roas: true, ctr: true },
  });

  // Lead pipeline
  const newLeads = await prisma.lead.count({
    where: { createdAt: { gte: weekStart } },
  });
  const qualifiedLeads = await prisma.lead.count({
    where: { temperature: { in: ['hot', 'warm'] }, updatedAt: { gte: weekStart } },
  });
  const convertedLeads = await prisma.lead.count({
    where: { convertedAt: { gte: weekStart } },
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

  // Framework performance ranking
  const frameworkPerf = await prisma.contentPiece.groupBy({
    by: ['framework'],
    where: {
      status: 'published',
      publishedAt: { gte: weekStart },
      framework: { not: null },
    },
    _avg: { engagementScore: true },
    _count: true,
  });

  // Best posting times (hour analysis)
  const publishedPieces = await prisma.contentPiece.findMany({
    where: {
      status: 'published',
      publishedAt: { gte: weekStart },
    },
    select: { publishedAt: true, engagementScore: true, platform: true },
  });

  const hourPerf = new Map<number, { total: number; count: number }>();
  for (const p of publishedPieces) {
    if (!p.publishedAt) continue;
    const hour = p.publishedAt.getUTCHours();
    const existing = hourPerf.get(hour) ?? { total: 0, count: 0 };
    existing.total += p.engagementScore;
    existing.count += 1;
    hourPerf.set(hour, existing);
  }
  const bestHours = [...hourPerf.entries()]
    .map(([hour, data]) => ({ hour, avgScore: data.count > 0 ? data.total / data.count : 0, count: data.count }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 3);

  // Platform performance
  const platformPerf = await prisma.contentPiece.groupBy({
    by: ['platform'],
    where: {
      status: 'published',
      publishedAt: { gte: weekStart },
    },
    _avg: { engagementScore: true },
    _count: true,
  });

  // Agent activity summary
  const agentActions = await prisma.aiLearningLog.groupBy({
    by: ['agentType', 'actionType'],
    where: { createdAt: { gte: weekStart } },
    _count: true,
  });

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
    frameworkRanking: frameworkPerf.map((f) => ({
      framework: f.framework,
      avgScore: f._avg.engagementScore ?? 0,
      postsCount: f._count,
    })),
    bestPostingHours: bestHours,
    platformPerformance: platformPerf.map((p) => ({
      platform: p.platform,
      avgScore: p._avg.engagementScore ?? 0,
      postsCount: p._count,
    })),
    agentActivity: agentActions.map((a) => ({
      agent: a.agentType,
      action: a.actionType,
      count: a._count,
    })),
  });

  const report = await claudeGenerate(
    `Tu es un analyste marketing senior. Génère un rapport hebdomadaire structuré en français.
Le rapport doit contenir :
1. Résumé exécutif (3 phrases max)
2. Performance contenu (top 3, tendances, quel framework performe le mieux)
3. Meilleurs horaires de publication (basé sur les données d'engagement par heure)
4. Performance par plateforme (LinkedIn vs Twitter vs autres)
5. Performance publicitaire (ROAS, meilleur ad set)
6. Pipeline leads (nouveaux, qualifiés, convertis)
7. Activité des agents IA (actions automatisées cette semaine)
8. Insights IA (patterns détectés, corrélations)
9. Plan d'action pour la semaine prochaine (5 recommandations concrètes et priorisées)

Sois concis, actionnable et data-driven. Termine par les 3 actions les plus urgentes.`,
    `Voici les données de la semaine :\n${context}`,
  );

  // Extract action items and create ContentInput briefs for next week
  const brand = await prisma.brand.findFirst();
  const user = await prisma.platformUser.findFirst();
  if (brand && user) {
    const briefGeneration = await claudeGenerate(
      `Extrais du rapport hebdomadaire ci-dessous les 3 briefs de contenu les plus urgents pour la semaine prochaine.
Réponds en JSON : [{ "topic": "...", "angle": "...", "platform": "...", "framework": "..." }]`,
      report,
    );
    try {
      const jsonMatch = briefGeneration.match(/\[[\s\S]*\]/);
      const briefs = jsonMatch ? JSON.parse(jsonMatch[0]) as { topic: string; angle: string; platform: string; framework: string }[] : [];
      for (const brief of briefs.slice(0, 3)) {
        await prisma.contentInput.create({
          data: {
            brandId: brand.id,
            createdById: user.id,
            inputType: 'auto_weekly_plan',
            rawContent: `[Weekly Plan] ${brief.topic}\nAngle: ${brief.angle}\nPlateforme: ${brief.platform}\nFramework: ${brief.framework}`,
            status: 'pending',
          },
        });
      }
    } catch { /* ignore parse errors */ }
  }

  // Send report via email to owners/admins
  const recipients = await prisma.platformUser.findMany({
    where: { role: { in: ['owner', 'admin'] } },
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

// ─── This Week Overview ─────────────────────────────────────────

export async function getThisWeekOverview() {
  const now = new Date();
  // Start of week (Monday)
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - mondayOffset));

  // Posts published this week
  const postsPublished = await prisma.contentPiece.count({
    where: { status: 'published', publishedAt: { gte: weekStart } },
  });

  // Posts scheduled (upcoming)
  const postsScheduled = await prisma.contentSchedule.count({
    where: { status: 'scheduled', scheduledAt: { gte: now } },
  });

  // Pending approvals
  const pendingApprovals = await prisma.approvalQueue.count({
    where: { status: 'pending' },
  });

  // Top post this week
  const topPost = await prisma.contentPiece.findFirst({
    where: { status: 'published', publishedAt: { gte: weekStart } },
    orderBy: { engagementScore: 'desc' },
    select: {
      id: true, title: true, platform: true, engagementScore: true, publishedAt: true,
    },
  });

  // New leads this week
  const newLeads = await prisma.lead.count({
    where: { createdAt: { gte: weekStart } },
  });

  // Hot leads
  const hotLeads = await prisma.lead.count({
    where: { temperature: 'hot', status: { not: 'converted' } },
  });

  // Week engagement totals
  const weekMetrics = await prisma.contentMetrics.aggregate({
    where: { collectedAt: { gte: weekStart } },
    _sum: { impressions: true, engagements: true, likes: true, comments: true, shares: true },
  });

  // Upcoming schedules (next 7 days)
  const upcomingSchedules = await prisma.contentSchedule.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 3600_000) },
    },
    include: {
      contentPiece: { select: { id: true, title: true, platform: true, mediaUrl: true } },
      socialAccount: { select: { platformUsername: true, platform: true } },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 10,
  });

  // Action items
  const actionItems: { type: string; label: string; count: number; priority: string }[] = [];
  if (pendingApprovals > 0) {
    actionItems.push({ type: 'approval', label: 'Approbations en attente', count: pendingApprovals, priority: 'high' });
  }
  if (hotLeads > 0) {
    actionItems.push({ type: 'leads', label: 'Leads chauds à contacter', count: hotLeads, priority: 'high' });
  }

  const failedSchedules = await prisma.contentSchedule.count({
    where: { status: 'failed' },
  });
  if (failedSchedules > 0) {
    actionItems.push({ type: 'error', label: 'Publications échouées', count: failedSchedules, priority: 'critical' });
  }

  return {
    period: { from: weekStart.toISOString(), to: now.toISOString() },
    stats: {
      postsPublished,
      postsScheduled,
      pendingApprovals,
      newLeads,
      hotLeads,
      impressions: weekMetrics._sum.impressions ?? 0,
      engagements: weekMetrics._sum.engagements ?? 0,
      likes: weekMetrics._sum.likes ?? 0,
      comments: weekMetrics._sum.comments ?? 0,
      shares: weekMetrics._sum.shares ?? 0,
    },
    topPost,
    upcomingSchedules,
    actionItems,
  };
}

// ─── Approval Queue with Preview (Story 9.4) ────────────────────

export async function getApprovalQueue(
  filters?: { status?: string; entityType?: string },
) {
  const approvals = await prisma.approvalQueue.findMany({
    where: {
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
