import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import * as landingPageService from '../services/landing-page.service';

// ─── Validation Schemas ─────────────────────────────────────
const createLandingPageSchema = z.object({
  brandId: z.string().min(1),
  productId: z.string().optional(),
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  heroTitle: z.string().optional(),
  heroSubtitle: z.string().optional(),
  heroCtaText: z.string().optional(),
  heroCtaUrl: z.string().optional(),
  sections: z.any().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

const updateLandingPageSchema = createLandingPageSchema.partial();

const router = Router();
const publicRouter = Router();

// ─── Protected routes ───────────────────────────────────────

router.get('/', asyncHandler(async (req, res) => {
  const { brandId } = req.query;
  const pages = await landingPageService.listLandingPages(brandId as string | undefined);
  res.json({ success: true, data: pages });
}));

router.get<{ id: string }>('/:id', asyncHandler(async (req, res) => {
  const page = await landingPageService.getLandingPageById(req.params.id);
  res.json({ success: true, data: page });
}));

router.post('/', validate(createLandingPageSchema), asyncHandler(async (req, res) => {
  const page = await landingPageService.createLandingPage(req.body);
  res.status(201).json({ success: true, data: page });
}));

router.put<{ id: string }>('/:id', validate(updateLandingPageSchema), asyncHandler(async (req, res) => {
  const page = await landingPageService.updateLandingPage(req.params.id, req.body);
  res.json({ success: true, data: page });
}));

router.post<{ id: string }>('/:id/publish', asyncHandler(async (req, res) => {
  const page = await landingPageService.publishLandingPage(req.params.id);
  res.json({ success: true, data: page });
}));

router.post<{ id: string }>('/:id/unpublish', asyncHandler(async (req, res) => {
  const page = await landingPageService.unpublishLandingPage(req.params.id);
  res.json({ success: true, data: page });
}));

router.post<{ id: string }>('/:id/generate', asyncHandler(async (req, res) => {
  // Generate from linked product
  const page = await landingPageService.getLandingPageById(req.params.id);
  if (!page.productId) {
    res.status(400).json({ success: false, error: { code: 'NO_PRODUCT', message: 'Landing page non liée à un produit' } });
    return;
  }
  const result = await landingPageService.generateLandingPageContent(page.productId);
  res.json({ success: true, data: result });
}));

router.delete<{ id: string }>('/:id', asyncHandler(async (req, res) => {
  await landingPageService.deleteLandingPage(req.params.id);
  res.json({ success: true, data: null });
}));

// ─── Public routes ──────────────────────────────────────────

publicRouter.get<{ slug: string }>('/:slug', asyncHandler(async (req, res) => {
  const page = await landingPageService.getLandingPageBySlug(req.params.slug);
  res.json({ success: true, data: page });
}));

export { router as landingPageRoutes, publicRouter as landingPagePublicRoutes };
