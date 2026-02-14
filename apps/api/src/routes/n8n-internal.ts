import { Router } from 'express';
import { z } from 'zod';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';

// ─── Validation Schemas ─────────────────────────────────────
const submitApprovalSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  assigneeId: z.string().optional(),
  priority: z.number().int().min(1).max(5).optional(),
});

const proposeCampaignSchema = z.object({
  signalId: z.string().min(1),
});

const approvalGateSchema = z.object({
  campaignId: z.string().min(1),
  decision: z.enum(['approved', 'rejected', 'revision']),
});

const enrollNurturingSchema = z.object({
  leadId: z.string().min(1),
  sequenceType: z.string().optional(),
});

const dailyAggregateSchema = z.object({
  date: z.string().optional(),
});

const router = Router();

// All routes require API key authentication
router.use(apiKeyAuth);

// ─── Agent 1: Content Flywheel ──────────────────────────────

// MKT-101: AI research on content input
router.post<{inputId: string}>('/content/research/:inputId', asyncHandler(async (req, res) => {
  const { runAiResearch } = await import('../services/content.service');
  const result = await runAiResearch(req.params.inputId);
  res.json({ success: true, data: result });
}));

// MKT-103: AI content generation from input
router.post<{inputId: string}>('/content/generate/:inputId', asyncHandler(async (req, res) => {
  const { generateContentPiece } = await import('../services/content.service');
  const result = await generateContentPiece(req.params.inputId, req.body);
  res.json({ success: true, data: result });
}));

// MKT-104: Submit content for approval
router.post('/approval/submit', validate(submitApprovalSchema), asyncHandler(async (req, res) => {
  const { submitForApproval } = await import('../services/approval.service');
  const { entityType, entityId, assigneeId, priority } = req.body;
  const result = await submitForApproval(entityType, entityId, assigneeId, priority);
  res.json({ success: true, data: result });
}));

// MKT-105: Process approval reminders
router.post('/approval/process-reminders', asyncHandler(async (_req, res) => {
  const { processReminders } = await import('../services/approval.service');
  const result = await processReminders();
  res.json({ success: true, data: result });
}));

// MKT-106: Schedule content to all platforms
router.post<{contentPieceId: string}>('/content/schedule/:contentPieceId', asyncHandler(async (req, res) => {
  const { adaptToAllPlatforms } = await import('../services/publishing.service');
  const result = await adaptToAllPlatforms(req.params.contentPieceId);
  res.json({ success: true, data: result });
}));

// MKT-107: Publish due content
router.post('/content/publish-due', asyncHandler(async (_req, res) => {
  const { publishScheduledContent } = await import('../services/publishing.service');
  const result = await publishScheduledContent();
  res.json({ success: true, data: result });
}));

// MKT-108: Collect metrics
router.post('/metrics/collect', asyncHandler(async (_req, res) => {
  const { collectMetrics } = await import('../services/metrics.service');
  const result = await collectMetrics();
  res.json({ success: true, data: result });
}));

// MKT-108: Detect winning signals
router.post('/metrics/detect-signals', asyncHandler(async (_req, res) => {
  const { detectWinningContent } = await import('../services/metrics.service');
  const result = await detectWinningContent();
  res.json({ success: true, data: result });
}));

// ─── Agent 2: Amplification Engine ─────────────────────────

// MKT-201: Competitive research
router.post('/advertising/competitive-research', asyncHandler(async (_req, res) => {
  const { prisma } = await import('../lib/prisma');
  const { runCompetitorResearch } = await import('../services/advertising.service');
  const brand = await prisma.brand.findFirst();
  if (!brand) { res.json({ success: false, message: 'No brand found' }); return; }
  const result = await runCompetitorResearch(brand.id);
  res.json({ success: true, data: result });
}));

// MKT-202: Propose ad campaign from signal
router.post('/advertising/propose-campaign', validate(proposeCampaignSchema), asyncHandler(async (req, res) => {
  const { prisma } = await import('../lib/prisma');
  const { generateCampaignProposal } = await import('../services/advertising.service');
  const { signalId } = req.body;
  const signal = await prisma.contentSignal.findUniqueOrThrow({ where: { id: signalId } });
  const brand = await prisma.brand.findFirst();
  if (!brand) { res.json({ success: false, message: 'No brand found' }); return; }
  const adAccount = await prisma.adAccount.findFirst({
    where: { socialAccount: { brandId: brand.id } },
  });
  if (!adAccount) { res.json({ success: false, message: 'No ad account found' }); return; }
  const result = await generateCampaignProposal({
    brandId: brand.id,
    adAccountId: adAccount.id,
    contentSignalId: signal.id,
    platform: adAccount.platform,
    objective: undefined,
  });
  res.json({ success: true, data: result });
}));

// MKT-203: Approval gate for ad campaigns
router.post('/advertising/approval-gate', validate(approvalGateSchema), asyncHandler(async (req, res) => {
  const { launchCampaign } = await import('../services/advertising.service');
  const { prisma } = await import('../lib/prisma');
  const { campaignId, decision } = req.body;
  if (decision === 'approved') {
    const result = await launchCampaign(campaignId);
    res.json({ success: true, data: result });
  } else {
    await prisma.adCampaign.update({ where: { id: campaignId }, data: { status: decision === 'rejected' ? 'REJECTED' : 'DRAFT' } });
    res.json({ success: true, data: { status: decision } });
  }
}));

// MKT-203/204: Launch an ad campaign
router.post<{campaignId: string}>('/advertising/launch/:campaignId', asyncHandler(async (req, res) => {
  const { launchCampaign } = await import('../services/advertising.service');
  const result = await launchCampaign(req.params.campaignId);
  res.json({ success: true, data: result });
}));

// MKT-205: Collect ad metrics
router.post('/advertising/collect-metrics', asyncHandler(async (_req, res) => {
  const { collectAdMetrics } = await import('../services/advertising.service');
  const result = await collectAdMetrics();
  res.json({ success: true, data: result });
}));

// MKT-206: Optimize campaigns
router.post('/advertising/optimize', asyncHandler(async (_req, res) => {
  const { optimizeCampaigns } = await import('../services/advertising.service');
  const result = await optimizeCampaigns();
  res.json({ success: true, data: result });
}));

// ─── Agent 3: Opportunity Hunter ────────────────────────────

// MKT-302: Score a lead
router.post<{leadId: string}>('/leads/score/:leadId', asyncHandler(async (req, res) => {
  const { scoreLead } = await import('../services/lead.service');
  const result = await scoreLead(req.params.leadId);
  res.json({ success: true, data: result });
}));

// MKT-305: Create booking for lead
router.post<{leadId: string}>('/leads/book/:leadId', asyncHandler(async (req, res) => {
  const { createBookingProposal } = await import('../services/lead.service');
  const result = await createBookingProposal(req.params.leadId);
  res.json({ success: true, data: result });
}));

// MKT-301/302: Enroll lead in nurturing sequence
router.post('/nurturing/enroll', validate(enrollNurturingSchema), asyncHandler(async (req, res) => {
  const { prisma } = await import('../lib/prisma');
  const { enrollLead } = await import('../services/nurturing.service');
  const { leadId, sequenceType } = req.body;
  const sequence = await prisma.leadSequence.findFirst({
    where: { name: { contains: sequenceType || 'warm', mode: 'insensitive' } },
  });
  if (!sequence) {
    res.json({ success: true, message: `No sequence found matching type "${sequenceType}"` });
    return;
  }
  const result = await enrollLead(leadId, sequence.id);
  res.json({ success: true, data: result });
}));

// MKT-306: Generate sales briefing for a lead
router.post<{leadId: string}>('/leads/briefing/:leadId', asyncHandler(async (req, res) => {
  const { prisma } = await import('../lib/prisma');
  const { generateSalesBriefing } = await import('../services/lead.service');
  const booking = await prisma.calendarBooking.findFirst({
    where: { leadId: req.params.leadId },
    orderBy: { createdAt: 'desc' },
  });
  if (!booking) {
    res.json({ success: true, message: 'No booking found for this lead' });
    return;
  }
  const result = await generateSalesBriefing(booking.id);
  res.json({ success: true, data: result });
}));

// MKT-303: Execute nurturing follow-ups
router.post('/nurturing/execute-followups', asyncHandler(async (_req, res) => {
  const { executeFollowUps } = await import('../services/nurturing.service');
  const result = await executeFollowUps();
  res.json({ success: true, data: result });
}));

// ─── Reporting & Utilities ──────────────────────────────────

// MKT-402: Daily analytics aggregation
router.post('/reporting/daily-aggregate', validate(dailyAggregateSchema), asyncHandler(async (req, res) => {
  const { aggregateDailyAnalytics } = await import('../services/reporting.service');
  const result = await aggregateDailyAnalytics(req.body.date);
  res.json({ success: true, data: result });
}));

// MKT-403: Weekly AI report
router.post('/reporting/weekly-report', asyncHandler(async (_req, res) => {
  const { generateWeeklyReport } = await import('../services/reporting.service');
  const result = await generateWeeklyReport();
  res.json({ success: true, data: result });
}));

// MKT-404: AI learning loop
router.post('/learning/run-loop', asyncHandler(async (_req, res) => {
  const { runLearningLoop } = await import('../services/feedback-loop.service');
  const result = await runLearningLoop();
  res.json({ success: true, data: result });
}));

// MKT-401: Refresh expiring OAuth tokens
router.post('/tokens/refresh-expiring', asyncHandler(async (_req, res) => {
  const { refreshExpiringTokens } = await import('../services/oauth-refresh.service');
  const result = await refreshExpiringTokens();
  res.json({ success: true, data: result });
}));

// MKT-110: Sync Notion content calendar
router.post('/notion/sync-calendar', asyncHandler(async (req, res) => {
  const { syncNotionCalendar } = await import('../services/notion-content.service');
  const date = req.body.date ? new Date(req.body.date) : undefined;
  const result = await syncNotionCalendar(date);
  res.json({ success: true, data: result });
}));

// Email campaign send (called by n8n)
router.post<{ campaignId: string }>('/email/send-campaign/:campaignId', asyncHandler(async (req, res) => {
  const { sendCampaign } = await import('../services/email-marketing.service');
  const result = await sendCampaign(req.params.campaignId);
  res.json({ success: true, data: result });
}));

export { router as n8nInternalRoutes };
