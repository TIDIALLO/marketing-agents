import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/requireRole';
import * as metricsService from '../services/metrics.service';
import * as analyticsService from '../services/analytics.service';
import * as reportingService from '../services/reporting.service';

const router = Router();

// ─── KPI Streaming SSE (Story 9.1) ──────────────────────────────

// GET /api/analytics/stream — SSE endpoint refreshing every 30s
router.get(
  '/stream',
  requirePermission('content:view'),
  (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Send initial data immediately
    const sendKPIs = async () => {
      try {
        const data = await reportingService.getStreamingKPIs();
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        res.write(`event: error\ndata: ${JSON.stringify({ message: 'KPI fetch failed' })}\n\n`);
      }
    };

    sendKPIs();
    const interval = setInterval(sendKPIs, 30_000);

    req.on('close', () => {
      clearInterval(interval);
    });
  },
);

// ─── This Week Overview ──────────────────────────────────────

// GET /api/analytics/this-week — actionable overview for the current week
router.get(
  '/this-week',
  requirePermission('content:view'),
  asyncHandler(async (_req, res) => {
    const data = await reportingService.getThisWeekOverview();
    res.json({ success: true, data });
  }),
);

// ─── Dashboard (Story 5.5) ──────────────────────────────────

// GET /api/analytics/dashboard — overview data
router.get(
  '/dashboard',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const data = await analyticsService.getDashboardData({
      brandId: req.query.brandId as string | undefined,
      platform: req.query.platform as string | undefined,
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
    });
    res.json({ success: true, data });
  }),
);

// GET /api/analytics/top-posts — best performing content
router.get(
  '/top-posts',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const posts = await analyticsService.getTopPosts({
      brandId: req.query.brandId as string | undefined,
      platform: req.query.platform as string | undefined,
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });
    res.json({ success: true, data: posts });
  }),
);

// GET /api/analytics/trends — daily engagement trends
router.get(
  '/trends',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const trends = await analyticsService.getTrends({
      brandId: req.query.brandId as string | undefined,
      platform: req.query.platform as string | undefined,
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
      days: req.query.days ? parseInt(req.query.days as string, 10) : undefined,
    });
    res.json({ success: true, data: trends });
  }),
);

// GET /api/analytics/pieces/:id/metrics — metrics history for a piece
router.get<{ id: string }>(
  '/pieces/:id/metrics',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const metrics = await analyticsService.getPieceMetricsHistory(
      req.params.id,
    );
    res.json({ success: true, data: metrics });
  }),
);

// ─── Signals (Story 5.4) ────────────────────────────────────

// GET /api/analytics/signals — list winning content signals
router.get(
  '/signals',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const signals = await metricsService.listSignals({
      brandId: req.query.brandId as string | undefined,
      signalType: req.query.signalType as string | undefined,
    });
    res.json({ success: true, data: signals });
  }),
);

// ─── Scheduler Triggers ──────────────────────────────────────

// POST /api/analytics/collect-metrics — trigger metrics collection (MKT-108)
router.post(
  '/collect-metrics',
  requirePermission('content:approve'),
  asyncHandler(async (_req, res) => {
    const results = await metricsService.collectMetrics();
    res.json({ success: true, data: results });
  }),
);

// POST /api/analytics/detect-signals — trigger signal detection (MKT-109)
router.post(
  '/detect-signals',
  requirePermission('content:approve'),
  asyncHandler(async (_req, res) => {
    const signals = await metricsService.detectWinningContent();
    res.json({ success: true, data: signals });
  }),
);

// POST /api/analytics/daily-aggregate — trigger daily aggregation (MKT-402)
router.post(
  '/daily-aggregate',
  requirePermission('content:approve'),
  asyncHandler(async (req, res) => {
    const result = await reportingService.aggregateDailyAnalytics(
      req.query.date as string | undefined,
    );
    res.json({ success: true, data: result });
  }),
);

// POST /api/analytics/weekly-report — trigger weekly AI report (MKT-403)
router.post(
  '/weekly-report',
  requirePermission('content:approve'),
  asyncHandler(async (req, res) => {
    const result = await reportingService.generateWeeklyReport();
    res.json({ success: true, data: result });
  }),
);

export { router as analyticsRoutes };
