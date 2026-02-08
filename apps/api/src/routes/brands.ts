import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/requireRole';
import * as brandService from '../services/brand.service';

const createBrandSchema = z.object({
  organizationId: z.string().min(1, 'Organisation requise'),
  name: z.string().trim().min(1, 'Nom requis'),
  brandVoice: z.string().optional(),
  targetAudience: z.string().optional(),
  contentGuidelines: z.string().optional(),
  visualGuidelines: z.string().optional(),
});

const updateBrandSchema = z.object({
  name: z.string().trim().min(1).optional(),
  brandVoice: z.string().optional(),
  targetAudience: z.string().optional(),
  contentGuidelines: z.string().optional(),
  visualGuidelines: z.string().optional(),
});

const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis'),
  description: z.string().trim().optional(),
});

const updateProductSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
});

const router = Router();

// ─── Brands ──────────────────────────────────────────────────

// POST /api/brands — create
router.post(
  '/',
  requirePermission('brands:create'),
  validate(createBrandSchema),
  asyncHandler(async (req, res) => {
    const brand = await brandService.createBrand(req.user!.tenantId, req.body);
    res.status(201).json({ success: true, data: brand });
  }),
);

// GET /api/brands — list
router.get(
  '/',
  requirePermission('brands:view'),
  asyncHandler(async (req, res) => {
    const brands = await brandService.listBrands(req.user!.tenantId);
    res.json({ success: true, data: brands });
  }),
);

// GET /api/brands/:id — detail
router.get<{ id: string }>(
  '/:id',
  requirePermission('brands:view'),
  asyncHandler(async (req, res) => {
    const brand = await brandService.getBrandById(req.user!.tenantId, req.params.id);
    res.json({ success: true, data: brand });
  }),
);

// PUT /api/brands/:id — update
router.put<{ id: string }>(
  '/:id',
  requirePermission('brands:edit'),
  validate(updateBrandSchema),
  asyncHandler(async (req, res) => {
    const brand = await brandService.updateBrand(req.user!.tenantId, req.params.id, req.body);
    res.json({ success: true, data: brand });
  }),
);

// DELETE /api/brands/:id — delete
router.delete<{ id: string }>(
  '/:id',
  requirePermission('brands:create'),
  asyncHandler(async (req, res) => {
    await brandService.deleteBrand(req.user!.tenantId, req.params.id);
    res.json({ success: true, data: { message: 'Marque supprimée' } });
  }),
);

// ─── Products ────────────────────────────────────────────────

// POST /api/brands/:brandId/products — create product
router.post<{ brandId: string }>(
  '/:brandId/products',
  requirePermission('brands:edit'),
  validate(createProductSchema),
  asyncHandler(async (req, res) => {
    const product = await brandService.createProduct(req.user!.tenantId, {
      brandId: req.params.brandId,
      ...req.body,
    });
    res.status(201).json({ success: true, data: product });
  }),
);

// GET /api/brands/:brandId/products — list products
router.get<{ brandId: string }>(
  '/:brandId/products',
  requirePermission('brands:view'),
  asyncHandler(async (req, res) => {
    const products = await brandService.listProducts(req.user!.tenantId, req.params.brandId);
    res.json({ success: true, data: products });
  }),
);

// PUT /api/brands/:brandId/products/:productId — update product
router.put<{ brandId: string; productId: string }>(
  '/:brandId/products/:productId',
  requirePermission('brands:edit'),
  validate(updateProductSchema),
  asyncHandler(async (req, res) => {
    const product = await brandService.updateProduct(
      req.user!.tenantId,
      req.params.productId,
      req.body,
    );
    res.json({ success: true, data: product });
  }),
);

// DELETE /api/brands/:brandId/products/:productId — delete product
router.delete<{ brandId: string; productId: string }>(
  '/:brandId/products/:productId',
  requirePermission('brands:create'),
  asyncHandler(async (req, res) => {
    await brandService.deleteProduct(req.user!.tenantId, req.params.productId);
    res.json({ success: true, data: { message: 'Produit supprimé' } });
  }),
);

export { router as brandRoutes };
