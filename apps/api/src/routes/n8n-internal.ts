import { Router } from 'express';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { asyncHandler } from '../middleware/asyncHandler';

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
router.post('/approval/submit', asyncHandler(async (req, res) => {
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

// MKT-303: Execute nurturing follow-ups
router.post('/nurturing/execute-followups', asyncHandler(async (_req, res) => {
  const { executeFollowUps } = await import('../services/nurturing.service');
  const result = await executeFollowUps();
  res.json({ success: true, data: result });
}));

// ─── Reporting & Utilities ──────────────────────────────────

// MKT-402: Daily analytics aggregation
router.post('/reporting/daily-aggregate', asyncHandler(async (req, res) => {
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

// Email campaign send (called by n8n)
router.post<{ campaignId: string }>('/email/send-campaign/:campaignId', asyncHandler(async (req, res) => {
  const { sendCampaign } = await import('../services/email-marketing.service');
  const result = await sendCampaign(req.params.campaignId);
  res.json({ success: true, data: result });
}));

export { router as n8nInternalRoutes };
