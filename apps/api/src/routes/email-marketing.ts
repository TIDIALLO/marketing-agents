import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import * as emailService from '../services/email-marketing.service';

const router = Router();
const trackingRouter = Router();

// ─── Templates ───────────────────────────────────────────────

router.get('/templates', asyncHandler(async (req, res) => {
  const { brandId } = req.query;
  const templates = await emailService.listTemplates(brandId as string | undefined);
  res.json({ success: true, data: templates });
}));

router.get('/templates/:id', asyncHandler(async (req, res) => {
  const template = await emailService.getTemplateById(req.params.id);
  res.json({ success: true, data: template });
}));

router.post('/templates', asyncHandler(async (req, res) => {
  const template = await emailService.createTemplate(req.body);
  res.status(201).json({ success: true, data: template });
}));

router.put('/templates/:id', asyncHandler(async (req, res) => {
  const template = await emailService.updateTemplate(req.params.id, req.body);
  res.json({ success: true, data: template });
}));

router.delete('/templates/:id', asyncHandler(async (req, res) => {
  await emailService.deleteTemplate(req.params.id);
  res.json({ success: true, data: null });
}));

// ─── Campaigns ───────────────────────────────────────────────

router.get('/campaigns', asyncHandler(async (req, res) => {
  const { brandId } = req.query;
  const campaigns = await emailService.listCampaigns(brandId as string | undefined);
  res.json({ success: true, data: campaigns });
}));

router.get('/campaigns/:id', asyncHandler(async (req, res) => {
  const campaign = await emailService.getCampaignById(req.params.id);
  res.json({ success: true, data: campaign });
}));

router.post('/campaigns', asyncHandler(async (req, res) => {
  const campaign = await emailService.createCampaign(req.body);
  res.status(201).json({ success: true, data: campaign });
}));

router.put('/campaigns/:id', asyncHandler(async (req, res) => {
  const campaign = await emailService.updateCampaign(req.params.id, req.body);
  res.json({ success: true, data: campaign });
}));

router.delete('/campaigns/:id', asyncHandler(async (req, res) => {
  await emailService.deleteCampaign(req.params.id);
  res.json({ success: true, data: null });
}));

router.post('/campaigns/:id/send', asyncHandler(async (req, res) => {
  const result = await emailService.sendCampaign(req.params.id);
  res.json({ success: true, data: result });
}));

router.post('/campaigns/:id/generate', asyncHandler(async (req, res) => {
  const result = await emailService.generateEmailContent(req.params.id);
  res.json({ success: true, data: result });
}));

// ─── Public Tracking Routes (no auth) ───────────────────────

// 1x1 pixel open tracking
trackingRouter.get('/open/:campaignId/:leadId', asyncHandler(async (req, res) => {
  await emailService.trackOpen(req.params.campaignId, req.params.leadId);
  // Return transparent 1x1 GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.writeHead(200, { 'Content-Type': 'image/gif', 'Content-Length': pixel.length, 'Cache-Control': 'no-store' });
  res.end(pixel);
}));

// Click tracking with redirect
trackingRouter.get('/click/:campaignId/:leadId', asyncHandler(async (req, res) => {
  await emailService.trackClick(req.params.campaignId, req.params.leadId);
  const url = (req.query.url as string) || '/';
  res.redirect(302, url);
}));

export { router as emailMarketingRoutes, trackingRouter as emailTrackingRoutes };
