import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import * as productService from '../services/product.service';

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

router.post('/', asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ success: true, data: product });
}));

router.put<{ id: string }>('/:id', asyncHandler(async (req, res) => {
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
