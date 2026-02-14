import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import * as productService from '../services/product.service';

// ─── Validation Schemas ─────────────────────────────────────
const createProductSchema = z.object({
  brandId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  tagline: z.string().optional(),
  longDescription: z.string().optional(),
  pricing: z.any().optional(),
  features: z.any().optional(),
  testimonials: z.any().optional(),
  ctaText: z.string().optional(),
  ctaUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const updateProductSchema = createProductSchema.partial();

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { brandId } = req.query;
  const products = await productService.listProducts(brandId as string | undefined);
  res.json({ success: true, data: products });
}));

router.get<{ id: string }>('/:id', asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  res.json({ success: true, data: product });
}));

router.post('/', validate(createProductSchema), asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ success: true, data: product });
}));

router.put<{ id: string }>('/:id', validate(updateProductSchema), asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.json({ success: true, data: product });
}));

router.delete<{ id: string }>('/:id', asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id);
  res.json({ success: true, data: null });
}));

router.post<{ id: string }>('/:id/generate-content', asyncHandler(async (req, res) => {
  const result = await productService.generateProductContent(req.params.id);
  res.json({ success: true, data: result });
}));

export { router as productRoutes };
