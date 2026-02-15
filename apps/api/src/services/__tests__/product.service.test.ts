import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';

// ─── Mocks ──────────────────────────────────────────────────────
const mockPrisma = {
  brand: { findFirst: vi.fn() },
  product: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({
  claudeGenerate: vi.fn().mockResolvedValue(JSON.stringify({
    tagline: 'Your SOC on autopilot',
    description: 'Automated SOC for SMBs.',
    longDescription: '# SOC Autopilot\nA comprehensive solution.',
    features: [{ icon: 'shield', title: 'Detection', description: 'AI threats' }],
    ctaText: 'Start Trial',
  })),
}));

const productService = await import('../product.service');

const mockBrand = { id: 'brand-1', name: 'MarketingEngine', brandVoice: null, targetAudience: null };
const mockProduct = {
  id: 'prod-1',
  brandId: 'brand-1',
  name: 'SOC Autopilot Hub',
  slug: 'soc-autopilot-hub',
  description: 'Automated SOC',
  tagline: null,
  longDescription: null,
  pricing: null,
  features: null,
  testimonials: null,
  ctaText: null,
  ctaUrl: null,
  isActive: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('product.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should create product with auto-generated slug', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      await productService.createProduct({ brandId: 'brand-1', name: 'SOC Autopilot Hub' });

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: 'soc-autopilot-hub',
        }),
      });
    });

    it('should use provided slug if given', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      await productService.createProduct({ brandId: 'brand-1', name: 'SOC Hub', slug: 'custom-slug' });

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ slug: 'custom-slug' }),
      });
    });

    it('should throw NOT_FOUND if brand does not exist', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(null);

      await expect(
        productService.createProduct({ brandId: 'missing', name: 'X' }),
      ).rejects.toThrow(AppError);
    });

    it('should handle special characters in slug generation', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      await productService.createProduct({ brandId: 'brand-1', name: 'My Product (v2.0)!' });

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ slug: 'my-product-v2-0' }),
      });
    });
  });

  describe('listProducts', () => {
    it('should list active products ordered by sortOrder', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);

      const result = await productService.listProducts();

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('should filter by brandId when provided', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await productService.listProducts('brand-1');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { brandId: 'brand-1', isActive: true },
        }),
      );
    });
  });

  describe('getProductById', () => {
    it('should return product with brand and landing pages', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...mockProduct,
        brand: { id: 'brand-1', name: 'MarketingEngine' },
        landingPages: [],
      });

      const result = await productService.getProductById('prod-1');

      expect(result.id).toBe('prod-1');
      expect(result.brand).toBeDefined();
    });

    it('should throw NOT_FOUND if product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(productService.getProductById('missing')).rejects.toThrow(AppError);
    });
  });

  describe('getProductBySlug', () => {
    it('should return product by slug', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ ...mockProduct, brand: { id: 'brand-1', name: 'MarketingEngine' } });

      const result = await productService.getProductBySlug('soc-autopilot-hub');

      expect(result.slug).toBe('soc-autopilot-hub');
    });

    it('should throw NOT_FOUND for invalid slug', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(productService.getProductBySlug('nope')).rejects.toThrow(AppError);
    });
  });

  describe('updateProduct', () => {
    it('should only update provided fields', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({ ...mockProduct, name: 'Updated' });

      await productService.updateProduct('prod-1', { name: 'Updated' });

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { name: 'Updated' },
      });
    });

    it('should throw NOT_FOUND for missing product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(productService.updateProduct('missing', { name: 'X' })).rejects.toThrow(AppError);
    });
  });

  describe('deleteProduct', () => {
    it('should delete existing product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.delete.mockResolvedValue(mockProduct);

      await productService.deleteProduct('prod-1');

      expect(mockPrisma.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } });
    });

    it('should throw NOT_FOUND for missing product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(productService.deleteProduct('missing')).rejects.toThrow(AppError);
    });
  });

  describe('generateProductContent', () => {
    it('should generate AI content and update product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...mockProduct,
        brand: { name: 'MarketingEngine', brandVoice: null, targetAudience: null },
      });
      mockPrisma.product.update.mockResolvedValue({ ...mockProduct, tagline: 'Your SOC on autopilot' });

      const result = await productService.generateProductContent('prod-1');

      expect(result.generatedContent).toBeDefined();
      expect(result.generatedContent.tagline).toBe('Your SOC on autopilot');
      expect(mockPrisma.product.update).toHaveBeenCalledOnce();
    });

    it('should throw NOT_FOUND if product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(productService.generateProductContent('missing')).rejects.toThrow(AppError);
    });

    it('should handle invalid JSON from AI gracefully', async () => {
      const { claudeGenerate } = await import('../../lib/ai');
      (claudeGenerate as any).mockResolvedValueOnce('Not valid JSON');

      mockPrisma.product.findUnique.mockResolvedValue({
        ...mockProduct,
        brand: { name: 'MarketingEngine', brandVoice: null, targetAudience: null },
      });
      mockPrisma.product.update.mockResolvedValue(mockProduct);

      const result = await productService.generateProductContent('prod-1');

      expect(result.generatedContent).toEqual({ rawContent: 'Not valid JSON' });
    });
  });
});
