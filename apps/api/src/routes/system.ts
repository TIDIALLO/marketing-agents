import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/requireRole';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import * as agentBusService from '../services/agent-bus.service';
import * as oauthRefreshService from '../services/oauth-refresh.service';
import * as feedbackLoopService from '../services/feedback-loop.service';
import * as monitoringService from '../services/monitoring.service';

const router = Router();

// ─── System Health (Story 10.8) ──────────────────────────────────

// GET /api/system/health — comprehensive health check
router.get(
  '/health',
  requirePermission('content:view'),
  asyncHandler(async (_req, res) => {
    const health = await monitoringService.getSystemHealth();
    res.json({ success: true, data: health });
  }),
);

// ─── OAuth Token Refresh (Story 10.1 — MKT-401) ────────────────

// POST /api/system/oauth/refresh — trigger token refresh
router.post(
  '/oauth/refresh',
  requirePermission('content:approve'),
  asyncHandler(async (_req, res) => {
    const results = await oauthRefreshService.refreshExpiringTokens();
    res.json({ success: true, data: results });
  }),
);

// ─── Agent Messages Bus (Story 10.2) ────────────────────────────

// GET /api/system/messages — list messages
router.get(
  '/messages',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const messages = await agentBusService.listMessages({
      channel: req.query.channel as string | undefined,
      consumed: req.query.consumed === 'true' ? true : req.query.consumed === 'false' ? false : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });
    res.json({ success: true, data: messages });
  }),
);

// GET /api/system/messages/stats — message stats
router.get(
  '/messages/stats',
  requirePermission('content:view'),
  asyncHandler(async (_req, res) => {
    const stats = await agentBusService.getMessageStats();
    res.json({ success: true, data: stats });
  }),
);

// POST /api/system/messages/:id/consume — mark message as consumed
router.post<{ id: string }>(
  '/messages/:id/consume',
  requirePermission('content:approve'),
  asyncHandler(async (req, res) => {
    const message = await agentBusService.consumeMessage(req.params.id, req.user!.userId);
    res.json({ success: true, data: message });
  }),
);

// POST /api/system/dlq/process — process dead letter queue
router.post(
  '/dlq/process',
  requirePermission('content:approve'),
  asyncHandler(async (_req, res) => {
    const result = await agentBusService.processDLQ();
    res.json({ success: true, data: result });
  }),
);

// ─── Feedback Loops (Stories 10.3-10.7) ──────────────────────────

// POST /api/system/feedback/amplify-signal — content → amplification (10.3)
router.post(
  '/feedback/amplify-signal',
  requirePermission('content:approve'),
  asyncHandler(async (req, res) => {
    const signalId = req.query.signalId as string | undefined;
    if (!signalId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'signalId query parameter requis' },
      });
      return;
    }
    const result = await feedbackLoopService.amplifyWinningContent(signalId);
    res.json({ success: true, data: result });
  }),
);

// POST /api/system/feedback/conversion-analysis — leads → content (10.5)
router.post(
  '/feedback/conversion-analysis',
  requirePermission('content:approve'),
  asyncHandler(async (req, res) => {
    const result = await feedbackLoopService.analyzeConversionPatterns(req.user!.tenantId);
    res.json({ success: true, data: result });
  }),
);

// POST /api/system/feedback/learning-loop — AI learning loop (10.6 — MKT-404)
router.post(
  '/feedback/learning-loop',
  requirePermission('content:approve'),
  asyncHandler(async (req, res) => {
    const result = await feedbackLoopService.runLearningLoop(req.user!.tenantId);
    res.json({ success: true, data: result });
  }),
);

// POST /api/system/feedback/ad-creative-insights — ads → content (10.7)
router.post(
  '/feedback/ad-creative-insights',
  requirePermission('content:approve'),
  asyncHandler(async (req, res) => {
    const result = await feedbackLoopService.extractAdCreativeInsights(req.user!.tenantId);
    res.json({ success: true, data: result });
  }),
);

// ─── Workflow Error Logging (Story 10.8) ─────────────────────────

const workflowErrorSchema = z.object({
  workflowId: z.string().min(1),
  workflowName: z.string().optional(),
  nodeName: z.string().optional(),
  errorMessage: z.string().min(1),
  errorStack: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

// POST /api/system/errors — log workflow error (called by n8n Error Trigger)
router.post(
  '/errors',
  apiKeyAuth,
  validate(workflowErrorSchema),
  asyncHandler(async (req, res) => {
    const error = await monitoringService.logWorkflowError(req.body);
    res.status(201).json({ success: true, data: error });
  }),
);

// GET /api/system/errors — list workflow errors
router.get(
  '/errors',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const errors = await monitoringService.listWorkflowErrors({
      workflowId: req.query.workflowId as string | undefined,
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });
    res.json({ success: true, data: errors });
  }),
);

export { router as systemRoutes };
