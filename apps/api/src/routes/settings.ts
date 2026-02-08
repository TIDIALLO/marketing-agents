import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/requireRole';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

const brandingSchema = z.object({
  logo: z.string().url('URL logo invalide').nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Format couleur invalide (#RRGGBB)').nullable().optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Format couleur invalide (#RRGGBB)').nullable().optional(),
  customDomain: z.string().min(1).nullable().optional(),
});

const notificationPrefsSchema = z.object({
  slack: z.boolean(),
  email: z.boolean(),
  whatsapp: z.boolean(),
});

const router = Router();

// ─── Tenant Branding (Story 2.5) ─────────────────────────────

// GET /api/admin/tenants/branding — get current branding
router.get(
  '/tenants/branding',
  requirePermission('tenant:branding'),
  asyncHandler(async (req, res) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user!.tenantId },
      select: {
        logo: true,
        primaryColor: true,
        secondaryColor: true,
        customDomain: true,
      },
    });
    if (!tenant) {
      throw new AppError(404, 'NOT_FOUND', 'Tenant introuvable');
    }
    res.json({ success: true, data: tenant });
  }),
);

// PUT /api/admin/tenants/branding — update branding
router.put(
  '/tenants/branding',
  requirePermission('tenant:branding'),
  validate(brandingSchema),
  asyncHandler(async (req, res) => {
    const tenant = await prisma.tenant.update({
      where: { id: req.user!.tenantId },
      data: req.body,
      select: {
        logo: true,
        primaryColor: true,
        secondaryColor: true,
        customDomain: true,
      },
    });
    res.json({ success: true, data: tenant });
  }),
);

// ─── Notification Preferences (Story 2.6) ────────────────────

// GET /api/auth/me/notifications — get prefs
router.get(
  '/me/notifications',
  requirePermission('settings:notifications'),
  asyncHandler(async (req, res) => {
    const user = await prisma.platformUser.findUnique({
      where: { id: req.user!.userId },
      select: { notificationPreferences: true },
    });
    res.json({
      success: true,
      data: user?.notificationPreferences ?? { slack: true, email: true, whatsapp: false },
    });
  }),
);

// PUT /api/auth/me/notifications — update prefs
router.put(
  '/me/notifications',
  requirePermission('settings:notifications'),
  validate(notificationPrefsSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.platformUser.update({
      where: { id: req.user!.userId },
      data: { notificationPreferences: req.body },
      select: { notificationPreferences: true },
    });
    res.json({ success: true, data: user.notificationPreferences });
  }),
);

export { router as settingsRoutes };
