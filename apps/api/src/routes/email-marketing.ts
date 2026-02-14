import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import * as emailService from '../services/email-marketing.service';

// ─── Validation Schemas ─────────────────────────────────────
const createTemplateSchema = z.object({
  brandId: z.string().min(1),
  name: z.string().min(1),
  subject: z.string().min(1),
  htmlContent: z.string().min(1),
});

const updateTemplateSchema = createTemplateSchema.partial();

const createCampaignSchema = z.object({
  brandId: z.string().min(1),
  name: z.string().min(1),
  emailTemplateId: z.string().min(1),
  recipientList: z.array(z.string().email()).min(1),
});

const updateCampaignSchema = createCampaignSchema.partial();

const router = Router();
const trackingRouter = Router();

// ─── Templates ───────────────────────────────────────────────

router.get('/templates', asyncHandler(async (req, res) => {
  const { brandId } = req.query;
  const templates = await emailService.listTemplates(brandId as string | undefined);
  res.json({ success: true, data: templates });
}));

router.get<{ id: string }>('/templates/:id', asyncHandler<{ id: string }>(async (req, res) => {
  const template = await emailService.getTemplateById(req.params.id);
  res.json({ success: true, data: template });
}));

router.post('/templates', validate(createTemplateSchema), asyncHandler(async (req, res) => {
  const template = await emailService.createTemplate(req.body);
  res.status(201).json({ success: true, data: template });
}));

router.put<{ id: string }>('/templates/:id', validate(updateTemplateSchema), asyncHandler<{ id: string }>(async (req, res) => {
  const template = await emailService.updateTemplate(req.params.id, req.body);
  res.json({ success: true, data: template });
}));

router.delete<{ id: string }>('/templates/:id', asyncHandler<{ id: string }>(async (req, res) => {
  await emailService.deleteTemplate(req.params.id);
  res.json({ success: true, data: null });
}));

// ─── Campaigns ───────────────────────────────────────────────

router.get('/campaigns', asyncHandler(async (req, res) => {
  const { brandId } = req.query;
  const campaigns = await emailService.listCampaigns(brandId as string | undefined);
  res.json({ success: true, data: campaigns });
}));

router.get<{ id: string }>('/campaigns/:id', asyncHandler<{ id: string }>(async (req, res) => {
  const campaign = await emailService.getCampaignById(req.params.id);
  res.json({ success: true, data: campaign });
}));

router.post('/campaigns', validate(createCampaignSchema), asyncHandler(async (req, res) => {
  const campaign = await emailService.createCampaign(req.body);
  res.status(201).json({ success: true, data: campaign });
}));

router.put<{ id: string }>('/campaigns/:id', validate(updateCampaignSchema), asyncHandler<{ id: string }>(async (req, res) => {
  const campaign = await emailService.updateCampaign(req.params.id, req.body);
  res.json({ success: true, data: campaign });
}));

router.delete<{ id: string }>('/campaigns/:id', asyncHandler<{ id: string }>(async (req, res) => {
  await emailService.deleteCampaign(req.params.id);
  res.json({ success: true, data: null });
}));

router.post<{ id: string }>('/campaigns/:id/send', asyncHandler<{ id: string }>(async (req, res) => {
  const result = await emailService.sendCampaign(req.params.id);
  res.json({ success: true, data: result });
}));

router.post<{ id: string }>('/campaigns/:id/generate', asyncHandler<{ id: string }>(async (req, res) => {
  const result = await emailService.generateEmailContent(req.params.id);
  res.json({ success: true, data: result });
}));

// ─── Public Tracking Routes (no auth) ───────────────────────

// 1x1 pixel open tracking
trackingRouter.get<{ campaignId: string; leadId: string }>('/open/:campaignId/:leadId', asyncHandler<{ campaignId: string; leadId: string }>(async (req, res) => {
  await emailService.trackOpen(req.params.campaignId, req.params.leadId);
  // Return transparent 1x1 GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.writeHead(200, { 'Content-Type': 'image/gif', 'Content-Length': pixel.length, 'Cache-Control': 'no-store' });
  res.end(pixel);
}));

// Click tracking with redirect
trackingRouter.get<{ campaignId: string; leadId: string }>('/click/:campaignId/:leadId', asyncHandler<{ campaignId: string; leadId: string }>(async (req, res) => {
  await emailService.trackClick(req.params.campaignId, req.params.leadId);
  const url = (req.query.url as string) || '/';
  res.redirect(302, url);
}));

export { router as emailMarketingRoutes, trackingRouter as emailTrackingRoutes };
