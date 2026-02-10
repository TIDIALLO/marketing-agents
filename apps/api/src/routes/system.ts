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
import * as signalCrossrefService from '../services/signal-crossref.service';
import * as agentOrchestratorService from '../services/agent-orchestrator.service';
import * as trendDetectionService from '../services/trend-detection.service';
import * as abTestingService from '../services/ab-testing.service';
import * as compoundLearningService from '../services/compound-learning.service';

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
  asyncHandler(async (_req, res) => {
    const result = await feedbackLoopService.analyzeConversionPatterns();
    res.json({ success: true, data: result });
  }),
);

// POST /api/system/feedback/learning-loop — AI learning loop (10.6 — MKT-404)
router.post(
  '/feedback/learning-loop',
  requirePermission('content:approve'),
  asyncHandler(async (_req, res) => {
    const result = await feedbackLoopService.runLearningLoop();
    res.json({ success: true, data: result });
  }),
);

// POST /api/system/feedback/ad-creative-insights — ads → content (10.7)
router.post(
  '/feedback/ad-creative-insights',
  requirePermission('content:approve'),
  asyncHandler(async (_req, res) => {
    const result = await feedbackLoopService.extractAdCreativeInsights();
    res.json({ success: true, data: result });
  }),
);

// POST /api/system/feedback/objection-briefs — objections → content briefs (2.4)
router.post(
  '/feedback/objection-briefs',
  requirePermission('content:approve'),
  asyncHandler(async (_req, res) => {
    const result = await feedbackLoopService.analyzeObjectionsAndCreateBriefs();
    res.json({ success: true, data: result });
  }),
);

// POST /api/system/feedback/signal-crossref — organic ↔ paid cross-referencing (3.4)
router.post(
  '/feedback/signal-crossref',
  requirePermission('content:approve'),
  asyncHandler(async (_req, res) => {
    const result = await signalCrossrefService.runSignalCrossReference();
    res.json({ success: true, data: result });
  }),
);

// ─── A/B Testing (4.4) ──────────────────────────────────────────

const abTestSchema = z.object({
  name: z.string().min(1),
  entityType: z.enum(['content_piece', 'email_subject', 'cta', 'ad_creative']),
  controlId: z.string().min(1),
  metric: z.string().optional(),
});

// POST /api/system/ab-tests — create A/B test
router.post(
  '/ab-tests',
  requirePermission('content:approve'),
  validate(abTestSchema),
  asyncHandler(async (req, res) => {
    const result = await abTestingService.createTest(req.body);
    res.status(201).json({ success: true, data: result });
  }),
);

// GET /api/system/ab-tests — list tests
router.get(
  '/ab-tests',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const tests = await abTestingService.listTests({
      status: req.query.status as string | undefined,
      entityType: req.query.entityType as string | undefined,
    });
    res.json({ success: true, data: tests });
  }),
);

// POST /api/system/ab-tests/:id/evaluate — determine winner
router.post<{ id: string }>(
  '/ab-tests/:id/evaluate',
  requirePermission('content:approve'),
  asyncHandler(async (req, res) => {
    const result = await abTestingService.determineWinner(req.params.id);
    res.json({ success: true, data: result });
  }),
);

// POST /api/system/ab-tests/evaluate-all — evaluate all running tests
router.post(
  '/ab-tests/evaluate-all',
  requirePermission('content:approve'),
  asyncHandler(async (_req, res) => {
    const result = await abTestingService.evaluateAllRunningTests();
    res.json({ success: true, data: result });
  }),
);

// ─── Compound Learning (4.5) ────────────────────────────────────

// GET /api/system/learning/frameworks — framework performance
router.get(
  '/learning/frameworks',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 60;
    const result = await compoundLearningService.analyzeFrameworkPerformance(days);
    res.json({ success: true, data: result });
  }),
);

// GET /api/system/learning/timing — best posting times
router.get(
  '/learning/timing',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 60;
    const result = await compoundLearningService.analyzePostingTimes(days);
    res.json({ success: true, data: result });
  }),
);

// POST /api/system/learning/update-voice — auto-update brand voice
router.post(
  '/learning/update-voice',
  requirePermission('content:approve'),
  asyncHandler(async (req, res) => {
    const brandId = req.query.brandId as string | undefined;
    if (!brandId) {
      // Use first brand
      const brand = await (await import('../lib/prisma')).prisma.brand.findFirst();
      if (!brand) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No brand found' } });
        return;
      }
      const result = await compoundLearningService.autoUpdateBrandVoice(brand.id);
      res.json({ success: true, data: result });
    } else {
      const result = await compoundLearningService.autoUpdateBrandVoice(brandId);
      res.json({ success: true, data: result });
    }
  }),
);

// GET /api/system/learning/prompts — prompt effectiveness tracking
router.get(
  '/learning/prompts',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    const result = await compoundLearningService.trackPromptEffectiveness(days);
    res.json({ success: true, data: result });
  }),
);

// POST /api/system/learning/cycle — run full compound learning cycle
router.post(
  '/learning/cycle',
  requirePermission('content:approve'),
  asyncHandler(async (_req, res) => {
    const result = await compoundLearningService.runCompoundLearningCycle();
    res.json({ success: true, data: result });
  }),
);

// ─── Agent Orchestrator Stats (4.1) ─────────────────────────────

// GET /api/system/agent-stats — agent orchestrator activity
router.get(
  '/agent-stats',
  requirePermission('content:view'),
  asyncHandler(async (_req, res) => {
    const stats = await agentOrchestratorService.getAgentStats();
    res.json({ success: true, data: stats });
  }),
);

// ─── Trend Detection (4.3) ──────────────────────────────────────

// GET /api/system/trends/hashtags — hashtag performance
router.get(
  '/trends/hashtags',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    const result = await trendDetectionService.analyzeHashtagPerformance(days);
    res.json({ success: true, data: result });
  }),
);

// POST /api/system/trends/detect — detect rising/declining topics
router.post(
  '/trends/detect',
  requirePermission('content:approve'),
  asyncHandler(async (_req, res) => {
    const result = await trendDetectionService.detectRisingTopics();
    res.json({ success: true, data: result });
  }),
);

// GET /api/system/trends/fatigue — content fatigue detection
router.get(
  '/trends/fatigue',
  requirePermission('content:view'),
  asyncHandler(async (_req, res) => {
    const result = await trendDetectionService.detectContentFatigue();
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
