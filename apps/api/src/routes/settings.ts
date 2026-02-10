import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/requireRole';
import { prisma } from '../lib/prisma';

const notificationPrefsSchema = z.object({
  slack: z.boolean(),
  email: z.boolean(),
  whatsapp: z.boolean(),
});

const router = Router();

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
