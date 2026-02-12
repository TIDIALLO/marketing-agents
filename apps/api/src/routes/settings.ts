import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/requireRole';
import { prisma } from '../lib/prisma';

const profileSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
});

const notificationPrefsSchema = z.object({
  slack: z.boolean().optional(),
  email: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
});

const router = Router();

// ─── Profile ────────────────────────────────────────────────

// PUT /api/settings/profile — update profile
router.put(
  '/profile',
  requirePermission('settings:notifications'),
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.platformUser.update({
      where: { id: req.user!.userId },
      data: {
        ...(req.body.firstName !== undefined ? { firstName: req.body.firstName } : {}),
        ...(req.body.lastName !== undefined ? { lastName: req.body.lastName } : {}),
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
    res.json({ success: true, data: user });
  }),
);

// ─── Notification Preferences ───────────────────────────────

// GET /api/settings/notifications — get prefs
router.get(
  '/notifications',
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

// PUT /api/settings/notifications — update prefs
router.put(
  '/notifications',
  requirePermission('settings:notifications'),
  validate(notificationPrefsSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.platformUser.findUnique({
      where: { id: req.user!.userId },
      select: { notificationPreferences: true },
    });
    const current = (existing?.notificationPreferences as Record<string, boolean>) ?? {};
    const merged = { ...current, ...req.body };

    const user = await prisma.platformUser.update({
      where: { id: req.user!.userId },
      data: { notificationPreferences: merged },
      select: { notificationPreferences: true },
    });
    res.json({ success: true, data: user.notificationPreferences });
  }),
);

export { router as settingsRoutes };
