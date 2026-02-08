import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/requireRole';
import * as leadService from '../services/lead.service';

// ─── Schemas ─────────────────────────────────────────────────

const ingestLeadSchema = z.object({
  brandId: z.string().min(1, 'Marque requise'),
  firstName: z.string().trim().min(1, 'Prénom requis'),
  lastName: z.string().trim().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.enum(['form', 'ad', 'webinar', 'referral', 'manual', 'csv']).optional(),
  sourceDetail: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  gdprConsent: z.boolean().optional(),
});

const updateLeadSchema = z.object({
  status: z.enum(['new', 'qualified', 'nurturing', 'opportunity', 'converted', 'lost']).optional(),
  assignedTo: z.string().optional(),
  temperature: z.enum(['hot', 'warm', 'cold']).optional(),
});

const router = Router();

// ─── Lead CRUD ───────────────────────────────────────────────

// POST /api/leads — manual lead creation
router.post(
  '/',
  requirePermission('content:create'),
  validate(ingestLeadSchema),
  asyncHandler(async (req, res) => {
    const lead = await leadService.ingestLead({
      tenantId: req.user!.tenantId,
      ...req.body,
    });
    res.status(201).json({ success: true, data: lead });
  }),
);

// GET /api/leads — list with filters
router.get(
  '/',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const leads = await leadService.listLeads(req.user!.tenantId, {
      brandId: req.query.brandId as string | undefined,
      temperature: req.query.temperature as string | undefined,
      status: req.query.status as string | undefined,
      source: req.query.source as string | undefined,
    });
    res.json({ success: true, data: leads });
  }),
);

// GET /api/leads/pipeline — funnel data (Story 6.6)
router.get(
  '/pipeline',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const funnel = await leadService.getPipelineFunnel(req.user!.tenantId, {
      brandId: req.query.brandId as string | undefined,
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
    });
    res.json({ success: true, data: funnel });
  }),
);

// GET /api/leads/:id — detail
router.get<{ id: string }>(
  '/:id',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const lead = await leadService.getLeadById(req.user!.tenantId, req.params.id);
    res.json({ success: true, data: lead });
  }),
);

// PUT /api/leads/:id — update
router.put<{ id: string }>(
  '/:id',
  requirePermission('content:create'),
  validate(updateLeadSchema),
  asyncHandler(async (req, res) => {
    const lead = await leadService.updateLead(req.user!.tenantId, req.params.id, req.body);
    res.json({ success: true, data: lead });
  }),
);

// ─── AI Actions ──────────────────────────────────────────────

// POST /api/leads/:id/score — trigger AI scoring (Story 6.3)
router.post<{ id: string }>(
  '/:id/score',
  requirePermission('content:create'),
  asyncHandler(async (req, res) => {
    const result = await leadService.scoreLead(req.user!.tenantId, req.params.id);
    res.json({ success: true, data: result });
  }),
);

// POST /api/leads/:id/book — create booking proposal (Story 6.4)
router.post<{ id: string }>(
  '/:id/book',
  requirePermission('content:create'),
  asyncHandler(async (req, res) => {
    const booking = await leadService.createBookingProposal(req.user!.tenantId, req.params.id);
    res.status(201).json({ success: true, data: booking });
  }),
);

// POST /api/leads/bookings/:id/briefing — generate sales briefing (Story 6.5)
router.post<{ id: string }>(
  '/bookings/:id/briefing',
  requirePermission('content:create'),
  asyncHandler(async (req, res) => {
    const booking = await leadService.generateSalesBriefing(req.user!.tenantId, req.params.id);
    res.json({ success: true, data: booking });
  }),
);

export { router as leadRoutes };
