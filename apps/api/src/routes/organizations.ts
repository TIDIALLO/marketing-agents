import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/requireRole';
import * as organizationService from '../services/organization.service';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis'),
  description: z.string().trim().optional(),
});

const updateSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').optional(),
  description: z.string().trim().optional(),
});

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide'),
  role: z.enum(['admin', 'editor', 'viewer'], {
    errorMap: () => ({ message: 'Rôle invalide (admin, editor, viewer)' }),
  }),
});

const router = Router();

// POST /api/organizations — create
router.post(
  '/',
  requirePermission('organizations:create'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const org = await organizationService.create(req.user!.tenantId, req.body);
    res.status(201).json({ success: true, data: org });
  }),
);

// GET /api/organizations — list
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const orgs = await organizationService.list(req.user!.tenantId);
    res.json({ success: true, data: orgs });
  }),
);

// GET /api/organizations/:id — detail
router.get<{ id: string }>(
  '/:id',
  asyncHandler(async (req, res) => {
    const org = await organizationService.getById(req.user!.tenantId, req.params.id);
    res.json({ success: true, data: org });
  }),
);

// PUT /api/organizations/:id — update
router.put<{ id: string }>(
  '/:id',
  requirePermission('organizations:create'),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const org = await organizationService.update(req.user!.tenantId, req.params.id, req.body);
    res.json({ success: true, data: org });
  }),
);

// DELETE /api/organizations/:id — delete
router.delete<{ id: string }>(
  '/:id',
  requirePermission('organizations:create'),
  asyncHandler(async (req, res) => {
    await organizationService.remove(req.user!.tenantId, req.params.id);
    res.json({ success: true, data: { message: 'Organisation supprimée' } });
  }),
);

// POST /api/organizations/:id/invite — invite user
router.post<{ id: string }>(
  '/:id/invite',
  requirePermission('users:invite'),
  validate(inviteSchema),
  asyncHandler(async (req, res) => {
    const invitation = await organizationService.invite(
      req.user!.tenantId,
      req.params.id,
      req.body,
    );
    res.status(201).json({ success: true, data: invitation });
  }),
);

// POST /api/organizations/invitations/accept — accept invitation
router.post(
  '/invitations/accept',
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    const org = await organizationService.acceptInvitation(token, req.user!.userId);
    res.json({ success: true, data: org });
  }),
);

export { router as organizationRoutes };
