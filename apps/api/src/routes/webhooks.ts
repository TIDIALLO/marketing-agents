import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import * as leadService from '../services/lead.service';
import * as nurturingService from '../services/nurturing.service';
import * as feedbackLoopService from '../services/feedback-loop.service';
import * as monitoringService from '../services/monitoring.service';

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

// POST /api/webhooks/mkt-304 — inbound lead response webhook (Story 7.3)
// Called by email reply handler, WhatsApp webhook, etc.
const responseWebhookSchema = z.object({
  tenantId: z.string().min(1),
  leadId: z.string().min(1),
  channel: z.enum(['email', 'whatsapp', 'phone', 'form']),
  content: z.string().min(1),
});

router.post(
  '/mkt-304',
  validate(responseWebhookSchema),
  asyncHandler(async (req, res) => {
    const result = await nurturingService.analyzeResponse(
      req.body.tenantId,
      req.body.leadId,
      { channel: req.body.channel, content: req.body.content },
    );
    res.json({ success: true, data: result });
  }),
);

// POST /api/webhooks/mkt-307 — conversion event webhook (Story 7.6)
const conversionWebhookSchema = z.object({
  tenantId: z.string().min(1),
  leadId: z.string().min(1),
  conversionValue: z.number().min(0),
  source: z.string().optional(),
});

router.post(
  '/mkt-307',
  validate(conversionWebhookSchema),
  asyncHandler(async (req, res) => {
    const result = await nurturingService.trackConversion(
      req.body.tenantId,
      req.body.leadId,
      { conversionValue: req.body.conversionValue, source: req.body.source },
    );
    res.json({ success: true, data: result });
  }),
);

// POST /api/webhooks/mkt-301-ad — ad lead ingestion with attribution (Story 10.4)
const adLeadWebhookSchema = z.object({
  tenantId: z.string().min(1),
  brandId: z.string().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  gdprConsent: z.boolean().optional(),
  campaignId: z.string().optional(),
  adSetId: z.string().optional(),
  creativeId: z.string().optional(),
  contentSignalId: z.string().optional(),
  adPlatform: z.string().optional(),
});

router.post(
  '/mkt-301-ad',
  apiKeyAuth,
  validate(adLeadWebhookSchema),
  asyncHandler(async (req, res) => {
    const { campaignId, adSetId, creativeId, contentSignalId, adPlatform, ...leadData } = req.body;
    const lead = await feedbackLoopService.ingestAdLead(leadData, {
      campaignId,
      adSetId,
      creativeId,
      contentSignalId,
      adPlatform,
    });
    res.status(201).json({ success: true, data: { leadId: lead.id } });
  }),
);

// POST /api/webhooks/n8n-error — n8n Error Trigger webhook (Story 10.8)
const n8nErrorSchema = z.object({
  workflowId: z.string().min(1),
  workflowName: z.string().optional(),
  nodeName: z.string().optional(),
  errorMessage: z.string().min(1),
  errorStack: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

router.post(
  '/n8n-error',
  apiKeyAuth,
  validate(n8nErrorSchema),
  asyncHandler(async (req, res) => {
    const error = await monitoringService.logWorkflowError(req.body);
    res.status(201).json({ success: true, data: { errorId: error.id } });
  }),
);

export { router as webhookRoutes };
