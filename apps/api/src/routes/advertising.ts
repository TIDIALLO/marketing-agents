import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/requireRole';
import * as advertisingService from '../services/advertising.service';

// ─── Schemas ─────────────────────────────────────────────────

const proposalSchema = z.object({
  brandId: z.string().min(1, 'Marque requise'),
  adAccountId: z.string().min(1, 'Compte pub requis'),
  contentSignalId: z.string().optional(),
  platform: z.enum(['facebook', 'tiktok', 'google'], {
    errorMap: () => ({ message: 'Plateforme invalide (facebook, tiktok, google)' }),
  }),
  objective: z.enum(['awareness', 'traffic', 'leads', 'conversions']).optional(),
});

const approvalSchema = z.object({
  assigneeId: z.string().optional(),
});

const router = Router();

// ─── Campaigns CRUD ──────────────────────────────────────────

// GET /api/advertising/campaigns — list
router.get(
  '/campaigns',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const campaigns = await advertisingService.listCampaigns(req.user!.tenantId, {
      brandId: req.query.brandId as string | undefined,
      status: req.query.status as string | undefined,
      platform: req.query.platform as string | undefined,
    });
    res.json({ success: true, data: campaigns });
  }),
);

// GET /api/advertising/campaigns/:id — detail
router.get<{ id: string }>(
  '/campaigns/:id',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const campaign = await advertisingService.getCampaignById(req.user!.tenantId, req.params.id);
    res.json({ success: true, data: campaign });
  }),
);

// ─── AI Campaign Proposal (Story 8.2) ────────────────────────

// POST /api/advertising/campaigns/propose — generate AI proposal
router.post(
  '/campaigns/propose',
  requirePermission('content:create'),
  validate(proposalSchema),
  asyncHandler(async (req, res) => {
    const campaign = await advertisingService.generateCampaignProposal(
      req.user!.tenantId,
      req.body,
    );
    res.status(201).json({ success: true, data: campaign });
  }),
);

// ─── Approval Gate (Story 8.3) ───────────────────────────────

// POST /api/advertising/campaigns/:id/submit-approval
router.post<{ id: string }>(
  '/campaigns/:id/submit-approval',
  requirePermission('content:approve'),
  validate(approvalSchema),
  asyncHandler(async (req, res) => {
    const approval = await advertisingService.submitCampaignForApproval(
      req.user!.tenantId,
      req.params.id,
      req.body.assigneeId,
    );
    res.json({ success: true, data: approval });
  }),
);

// ─── Campaign Launch (Stories 8.4, 8.5) ──────────────────────

// POST /api/advertising/campaigns/:id/launch
router.post<{ id: string }>(
  '/campaigns/:id/launch',
  requirePermission('content:approve'),
  asyncHandler(async (req, res) => {
    const campaign = await advertisingService.launchCampaign(req.user!.tenantId, req.params.id);
    res.json({ success: true, data: campaign });
  }),
);

// POST /api/advertising/campaigns/:id/pause
router.post<{ id: string }>(
  '/campaigns/:id/pause',
  requirePermission('content:approve'),
  asyncHandler(async (req, res) => {
    const campaign = await advertisingService.pauseCampaign(req.user!.tenantId, req.params.id);
    res.json({ success: true, data: campaign });
  }),
);

// ─── Competitor Research (Story 8.1) ─────────────────────────

// POST /api/advertising/competitors/research — trigger research (MKT-201)
router.post(
  '/competitors/research',
  requirePermission('content:create'),
  asyncHandler(async (req, res) => {
    const brandId = req.query.brandId as string | undefined;
    if (!brandId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'brandId query parameter requis' },
      });
      return;
    }
    const ads = await advertisingService.runCompetitorResearch(req.user!.tenantId, brandId);
    res.json({ success: true, data: ads });
  }),
);

// GET /api/advertising/competitors — list competitor ads
router.get(
  '/competitors',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const ads = await advertisingService.listCompetitorAds(req.user!.tenantId, {
      brandId: req.query.brandId as string | undefined,
      platform: req.query.platform as string | undefined,
    });
    res.json({ success: true, data: ads });
  }),
);

// ─── Scheduler Triggers (n8n MKT-205, MKT-206) ──────────────

// POST /api/advertising/collect-metrics — trigger metrics collection (MKT-205)
router.post(
  '/collect-metrics',
  requirePermission('content:approve'),
  asyncHandler(async (_req, res) => {
    const results = await advertisingService.collectAdMetrics();
    res.json({ success: true, data: results });
  }),
);

// POST /api/advertising/optimize — trigger AI optimization (MKT-206)
router.post(
  '/optimize',
  requirePermission('content:approve'),
  asyncHandler(async (req, res) => {
    const results = await advertisingService.optimizeCampaigns(req.user!.tenantId);
    res.json({ success: true, data: results });
  }),
);

export { router as advertisingRoutes };
