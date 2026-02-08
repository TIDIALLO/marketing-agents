import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/requireRole';
import * as approvalService from '../services/approval.service';

// ─── Schemas ─────────────────────────────────────────────────

const submitSchema = z.object({
  entityType: z.enum(['content_piece', 'ad_campaign'], {
    errorMap: () => ({ message: 'Type invalide (content_piece, ad_campaign)' }),
  }),
  entityId: z.string().min(1, 'ID entité requis'),
  assigneeId: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});

const resolveSchema = z.object({
  action: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Action invalide (approved, rejected)' }),
  }),
});

// ─── Public Routes (token-based, no auth) ────────────────────

const publicRouter = Router();

// GET /api/approval/resolve/:token — resolve via email/Slack action link (Story 4.2)
publicRouter.get<{ token: string }>(
  '/resolve/:token',
  asyncHandler(async (req, res) => {
    const action = req.query.action as string | undefined;
    if (!action || !['approved', 'rejected'].includes(action)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Paramètre action requis (approved/rejected)' },
      });
      return;
    }

    const approval = await approvalService.resolveByToken(req.params.token, action);
    res.json({
      success: true,
      data: approval,
      message: action === 'approved' ? 'Contenu approuvé avec succès !' : 'Contenu rejeté.',
    });
  }),
);

// ─── Protected Routes (authenticated) ────────────────────────

const protectedRouter = Router();

// POST /api/approval/submit
protectedRouter.post(
  '/submit',
  requirePermission('content:create'),
  validate(submitSchema),
  asyncHandler(async (req, res) => {
    const approval = await approvalService.submitForApproval(
      req.user!.tenantId,
      req.body.entityType,
      req.body.entityId,
      req.body.assigneeId,
      req.body.priority,
    );
    res.status(201).json({ success: true, data: approval });
  }),
);

// GET /api/approval/queue
protectedRouter.get(
  '/queue',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const approvals = await approvalService.listApprovals(req.user!.tenantId, {
      status: req.query.status as string | undefined,
      entityType: req.query.entityType as string | undefined,
    });
    res.json({ success: true, data: approvals });
  }),
);

// GET /api/approval/queue/:id
protectedRouter.get<{ id: string }>(
  '/queue/:id',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const approval = await approvalService.getApprovalById(req.user!.tenantId, req.params.id);
    res.json({ success: true, data: approval });
  }),
);

// POST /api/approval/queue/:id/resolve — authenticated resolution
protectedRouter.post<{ id: string }>(
  '/queue/:id/resolve',
  requirePermission('content:approve'),
  validate(resolveSchema),
  asyncHandler(async (req, res) => {
    const approval = await approvalService.resolveById(
      req.user!.tenantId,
      req.params.id,
      req.body.action,
      req.user!.userId,
    );
    res.json({ success: true, data: approval });
  }),
);

// POST /api/approval/reminders — trigger reminder check (called by MKT-105)
protectedRouter.post(
  '/reminders',
  requirePermission('content:approve'),
  asyncHandler(async (_req, res) => {
    const results = await approvalService.processReminders();
    res.json({ success: true, data: results });
  }),
);

export { publicRouter as approvalPublicRoutes, protectedRouter as approvalRoutes };
