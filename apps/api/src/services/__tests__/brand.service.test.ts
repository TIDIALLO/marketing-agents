import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';

// ─── Mocks ──────────────────────────────────────────────────────
const mockPrisma = {
  brand: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  product: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));

const brandService = await import('../brand.service');

const mockBrand = {
  id: 'brand-1',
  userId: 'user-1',
  name: 'MarketingEngine',
  brandVoice: null,
  targetAudience: null,
  contentGuidelines: null,
  visualGuidelines: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('brand.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBrand', () => {
    it('should create a brand with required fields', async () => {
      mockPrisma.brand.create.mockResolvedValue(mockBrand);

      const result = await brandService.createBrand('user-1', { name: 'MarketingEngine' });

      expect(mockPrisma.brand.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          name: 'MarketingEngine',
        }),
      });
      expect(result).toEqual(mockBrand);
    });

    it('should pass optional JSON fields through jsonOrDbNull', async () => {
      const jsonString = '{"tone":["expert"]}';
      mockPrisma.brand.create.mockResolvedValue(mockBrand);

      await brandService.createBrand('user-1', { name: 'Test', brandVoice: jsonString });

      expect(mockPrisma.brand.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ brandVoice: jsonString }),
      });
    });
  });

  describe('listBrands', () => {
    it('should return brands with product/social counts', async () => {
      const brands = [{ ...mockBrand, _count: { products: 2, socialAccounts: 1 } }];
      mockPrisma.brand.findMany.mockResolvedValue(brands);

      const result = await brandService.listBrands();

      expect(mockPrisma.brand.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { _count: { select: { products: true, socialAccounts: true } } },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toEqual(brands);
    });
  });

  describe('getBrandById', () => {
    it('should return brand with products and social accounts', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue({ ...mockBrand, products: [], socialAccounts: [] });

      const result = await brandService.getBrandById('brand-1');

      expect(result.id).toBe('brand-1');
    });

    it('should throw NOT_FOUND if brand does not exist', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(null);

      await expect(brandService.getBrandById('missing')).rejects.toThrow(AppError);
      try {
        await brandService.getBrandById('missing');
      } catch (err) {
        expect((err as AppError).statusCode).toBe(404);
      }
    });
  });

  describe('updateBrand', () => {
    it('should update brand fields', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
      mockPrisma.brand.update.mockResolvedValue({ ...mockBrand, name: 'Updated' });

      const result = await brandService.updateBrand('brand-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should throw NOT_FOUND for missing brand', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(null);

      await expect(brandService.updateBrand('missing', { name: 'x' })).rejects.toThrow(AppError);
    });
  });

  describe('updateBrandVoice', () => {
    const validVoice = {
      tone: ['expert', 'approachable'],
      vocabulary: { preferred: ['secure', 'automate'], avoided: [] },
      persona: { name: 'Alex', role: 'CTO' },
      languageStyle: { formality: 'professional' as const },
    };

    it('should update brand voice with valid config', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
      mockPrisma.brand.update.mockResolvedValue({ ...mockBrand, brandVoice: validVoice });

      const result = await brandService.updateBrandVoice('brand-1', validVoice);

      expect(mockPrisma.brand.update).toHaveBeenCalledWith({
        where: { id: 'brand-1' },
        data: { brandVoice: validVoice },
      });
      expect(result.brandVoice).toEqual(validVoice);
    });

    it('should throw VALIDATION_ERROR for empty tone', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);

      await expect(
        brandService.updateBrandVoice('brand-1', { ...validVoice, tone: [] }),
      ).rejects.toThrow(AppError);

      try {
        await brandService.updateBrandVoice('brand-1', { ...validVoice, tone: [] });
      } catch (err) {
        expect((err as AppError).statusCode).toBe(400);
        expect((err as AppError).code).toBe('VALIDATION_ERROR');
      }
    });

    it('should throw VALIDATION_ERROR for missing persona name', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);

      await expect(
        brandService.updateBrandVoice('brand-1', { ...validVoice, persona: { name: '', role: 'CTO' } }),
      ).rejects.toThrow(AppError);
    });

    it('should throw VALIDATION_ERROR for invalid formality', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);

      await expect(
        brandService.updateBrandVoice('brand-1', {
          ...validVoice,
          languageStyle: { formality: 'ultra-casual' as any },
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteBrand', () => {
    it('should delete an existing brand', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
      mockPrisma.brand.delete.mockResolvedValue(mockBrand);

      await brandService.deleteBrand('brand-1');

      expect(mockPrisma.brand.delete).toHaveBeenCalledWith({ where: { id: 'brand-1' } });
    });

    it('should throw NOT_FOUND for missing brand', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(null);

      await expect(brandService.deleteBrand('missing')).rejects.toThrow(AppError);
    });
  });

  describe('createProduct (via brand.service)', () => {
    it('should create product after verifying brand', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
      mockPrisma.product.create.mockResolvedValue({ id: 'prod-1', brandId: 'brand-1', name: 'SOC Hub' });

      const result = await brandService.createProduct({ brandId: 'brand-1', name: 'SOC Hub' });

      expect(result.name).toBe('SOC Hub');
    });

    it('should throw NOT_FOUND if brand does not exist', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(null);

      await expect(brandService.createProduct({ brandId: 'missing', name: 'X' })).rejects.toThrow(AppError);
    });
  });
});
