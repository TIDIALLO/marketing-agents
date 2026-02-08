import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/requireRole';
import * as socialAccountService from '../services/social-account.service';

const connectSocialSchema = z.object({
  brandId: z.string().min(1, 'Marque requise'),
  platform: z.enum(['linkedin', 'facebook', 'instagram', 'tiktok', 'twitter'], {
    errorMap: () => ({ message: 'Plateforme invalide' }),
  }),
  platformUserId: z.string().optional(),
  platformUsername: z.string().optional(),
  accessToken: z.string().min(1, 'Access token requis'),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
});

const connectAdSchema = z.object({
  platform: z.enum(['facebook', 'tiktok', 'google'], {
    errorMap: () => ({ message: 'Plateforme pub invalide' }),
  }),
  platformAccountId: z.string().min(1, 'ID compte pub requis'),
  name: z.string().trim().optional(),
  credentials: z.string().optional(),
});

const router = Router();

// ─── Social Accounts ─────────────────────────────────────────

// POST /api/social-accounts — connect
router.post(
  '/',
  requirePermission('settings:social'),
  validate(connectSocialSchema),
  asyncHandler(async (req, res) => {
    const account = await socialAccountService.connectSocialAccount(
      req.user!.tenantId,
      req.body,
    );
    res.status(201).json({ success: true, data: account });
  }),
);

// GET /api/social-accounts?brandId= — list by brand
router.get(
  '/',
  requirePermission('settings:social'),
  asyncHandler(async (req, res) => {
    const brandId = req.query.brandId as string | undefined;
    if (!brandId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'brandId query parameter requis' },
      });
      return;
    }
    const accounts = await socialAccountService.listSocialAccounts(req.user!.tenantId, brandId);
    res.json({ success: true, data: accounts });
  }),
);

// DELETE /api/social-accounts/:id — disconnect
router.delete<{ id: string }>(
  '/:id',
  requirePermission('settings:social'),
  asyncHandler(async (req, res) => {
    await socialAccountService.disconnectSocialAccount(req.user!.tenantId, req.params.id);
    res.json({ success: true, data: { message: 'Compte social déconnecté' } });
  }),
);

// ─── Ad Accounts ─────────────────────────────────────────────

// POST /api/social-accounts/:id/ad-accounts — connect ad account
router.post<{ id: string }>(
  '/:id/ad-accounts',
  requirePermission('settings:social'),
  validate(connectAdSchema),
  asyncHandler(async (req, res) => {
    const adAccount = await socialAccountService.connectAdAccount(
      req.user!.tenantId,
      req.params.id,
      req.body,
    );
    res.status(201).json({ success: true, data: adAccount });
  }),
);

// GET /api/social-accounts/:id/ad-accounts — list ad accounts
router.get<{ id: string }>(
  '/:id/ad-accounts',
  requirePermission('settings:social'),
  asyncHandler(async (req, res) => {
    const adAccounts = await socialAccountService.listAdAccounts(
      req.user!.tenantId,
      req.params.id,
    );
    res.json({ success: true, data: adAccounts });
  }),
);

// DELETE /api/social-accounts/ad-accounts/:adAccountId — disconnect ad account
router.delete<{ adAccountId: string }>(
  '/ad-accounts/:adAccountId',
  requirePermission('settings:social'),
  asyncHandler(async (req, res) => {
    await socialAccountService.disconnectAdAccount(req.user!.tenantId, req.params.adAccountId);
    res.json({ success: true, data: { message: 'Compte publicitaire déconnecté' } });
  }),
);

export { router as socialAccountRoutes };
