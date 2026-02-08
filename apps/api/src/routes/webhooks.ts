import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import * as leadService from '../services/lead.service';

// ─── Schemas ─────────────────────────────────────────────────

const leadWebhookSchema = z.object({
  tenantId: z.string().min(1),
  brandId: z.string().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  sourceDetail: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  gdprConsent: z.boolean().optional(),
});

const router = Router();

// POST /api/webhooks/mkt-301 — lead ingestion webhook (Story 6.1)
// Public endpoint: called by Facebook Lead Ads, forms, n8n, etc.
router.post(
  '/mkt-301',
  validate(leadWebhookSchema),
  asyncHandler(async (req, res) => {
    const lead = await leadService.ingestLead(req.body);
    res.status(201).json({ success: true, data: { leadId: lead.id } });
  }),
);

export { router as webhookRoutes };
