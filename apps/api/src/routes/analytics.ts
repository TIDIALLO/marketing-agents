import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/requireRole';
import * as metricsService from '../services/metrics.service';
import * as analyticsService from '../services/analytics.service';

const router = Router();

// ─── Dashboard (Story 5.5) ──────────────────────────────────

// GET /api/analytics/dashboard — overview data
router.get(
  '/dashboard',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const data = await analyticsService.getDashboardData(req.user!.tenantId, {
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
    const posts = await analyticsService.getTopPosts(req.user!.tenantId, {
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
    const trends = await analyticsService.getTrends(req.user!.tenantId, {
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
      req.user!.tenantId,
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
    const signals = await metricsService.listSignals(req.user!.tenantId, {
      brandId: req.query.brandId as string | undefined,
      signalType: req.query.signalType as string | undefined,
    });
    res.json({ success: true, data: signals });
  }),
);

// ─── Scheduler Triggers (called by n8n MKT-108, MKT-109) ────

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

export { router as analyticsRoutes };
