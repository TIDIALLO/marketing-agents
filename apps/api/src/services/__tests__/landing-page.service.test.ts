import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';

// ─── Mocks ──────────────────────────────────────────────────────
const mockPrisma = {
  brand: { findFirst: vi.fn() },
  product: { findUnique: vi.fn() },
  landingPage: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
  },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({
  claudeGenerate: vi.fn().mockResolvedValue(JSON.stringify({
    heroTitle: 'Automate Your SOC',
    heroSubtitle: 'AI-powered security for modern teams',
    heroCtaText: 'Start Free Trial',
    seoTitle: 'SOC Autopilot Hub',
    seoDescription: 'Automated SOC platform for SMBs',
    sections: [{ type: 'features', title: 'Features', items: [] }],
  })),
}));

const landingPageService = await import('../landing-page.service');

const mockBrand = { id: 'brand-1', name: 'MarketingEngine' };
const mockPage = {
  id: 'lp-1',
  brandId: 'brand-1',
  productId: 'prod-1',
  slug: 'soc-autopilot-hub',
  title: 'SOC Autopilot Hub',
  heroTitle: 'Automate Your SOC',
  heroSubtitle: 'AI-powered',
  heroCtaText: 'Try it',
  heroCtaUrl: '#',
  sections: [],
  seoTitle: 'SOC Hub',
  seoDescription: 'Automated SOC',
  isPublished: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('landing-page.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLandingPage', () => {
    it('should create landing page with all fields', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
      mockPrisma.landingPage.create.mockResolvedValue(mockPage);

      const result = await landingPageService.createLandingPage({
        brandId: 'brand-1',
        slug: 'soc-autopilot-hub',
        title: 'SOC Autopilot Hub',
        heroTitle: 'Automate',
      });

      expect(result.id).toBe('lp-1');
      expect(mockPrisma.landingPage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          brandId: 'brand-1',
          slug: 'soc-autopilot-hub',
          title: 'SOC Autopilot Hub',
          heroTitle: 'Automate',
        }),
      });
    });

    it('should throw NOT_FOUND if brand does not exist', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(null);

      await expect(
        landingPageService.createLandingPage({ brandId: 'missing', slug: 'x', title: 'X' }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('listLandingPages', () => {
    it('should list all pages with brand and product', async () => {
      mockPrisma.landingPage.findMany.mockResolvedValue([mockPage]);

      const result = await landingPageService.listLandingPages();

      expect(result).toHaveLength(1);
      expect(mockPrisma.landingPage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('should filter by brandId when provided', async () => {
      mockPrisma.landingPage.findMany.mockResolvedValue([]);

      await landingPageService.listLandingPages('brand-1');

      expect(mockPrisma.landingPage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { brandId: 'brand-1' } }),
      );
    });
  });

  describe('getLandingPageById', () => {
    it('should return page with brand and product', async () => {
      mockPrisma.landingPage.findUnique.mockResolvedValue({ ...mockPage, brand: mockBrand, product: null });

      const result = await landingPageService.getLandingPageById('lp-1');

      expect(result.id).toBe('lp-1');
    });

    it('should throw NOT_FOUND for missing page', async () => {
      mockPrisma.landingPage.findUnique.mockResolvedValue(null);

      await expect(landingPageService.getLandingPageById('missing')).rejects.toThrow(AppError);
    });
  });

  describe('getLandingPageBySlug', () => {
    it('should return published page', async () => {
      mockPrisma.landingPage.findUnique.mockResolvedValue({
        ...mockPage,
        isPublished: true,
        brand: mockBrand,
        product: null,
      });

      const result = await landingPageService.getLandingPageBySlug('soc-autopilot-hub');

      expect(result.slug).toBe('soc-autopilot-hub');
    });

    it('should throw NOT_FOUND for unpublished page', async () => {
      mockPrisma.landingPage.findUnique.mockResolvedValue({
        ...mockPage,
        isPublished: false,
        brand: mockBrand,
        product: null,
      });

      await expect(landingPageService.getLandingPageBySlug('soc-autopilot-hub')).rejects.toThrow(AppError);
    });

    it('should throw NOT_FOUND for missing slug', async () => {
      mockPrisma.landingPage.findUnique.mockResolvedValue(null);

      await expect(landingPageService.getLandingPageBySlug('nope')).rejects.toThrow(AppError);
    });
  });

  describe('updateLandingPage', () => {
    it('should update only provided fields', async () => {
      mockPrisma.landingPage.findUnique.mockResolvedValue(mockPage);
      mockPrisma.landingPage.update.mockResolvedValue({ ...mockPage, title: 'Updated' });

      await landingPageService.updateLandingPage('lp-1', { title: 'Updated' });

      expect(mockPrisma.landingPage.update).toHaveBeenCalledWith({
        where: { id: 'lp-1' },
        data: { title: 'Updated' },
      });
    });

    it('should throw NOT_FOUND for missing page', async () => {
      mockPrisma.landingPage.findUnique.mockResolvedValue(null);

      await expect(landingPageService.updateLandingPage('missing', { title: 'X' })).rejects.toThrow(AppError);
    });
  });

  describe('publishLandingPage', () => {
    it('should set isPublished to true', async () => {
      mockPrisma.landingPage.findUnique.mockResolvedValue(mockPage);
      mockPrisma.landingPage.update.mockResolvedValue({ ...mockPage, isPublished: true });

      const result = await landingPageService.publishLandingPage('lp-1');

      expect(mockPrisma.landingPage.update).toHaveBeenCalledWith({
        where: { id: 'lp-1' },
        data: { isPublished: true },
      });
      expect(result.isPublished).toBe(true);
    });

    it('should throw NOT_FOUND for missing page', async () => {
      mockPrisma.landingPage.findUnique.mockResolvedValue(null);

      await expect(landingPageService.publishLandingPage('missing')).rejects.toThrow(AppError);
    });
  });

  describe('unpublishLandingPage', () => {
    it('should set isPublished to false', async () => {
      mockPrisma.landingPage.findUnique.mockResolvedValue({ ...mockPage, isPublished: true });
      mockPrisma.landingPage.update.mockResolvedValue({ ...mockPage, isPublished: false });

      const result = await landingPageService.unpublishLandingPage('lp-1');

      expect(result.isPublished).toBe(false);
    });
  });

  describe('deleteLandingPage', () => {
    it('should delete existing page', async () => {
      mockPrisma.landingPage.findUnique.mockResolvedValue(mockPage);
      mockPrisma.landingPage.delete.mockResolvedValue(mockPage);

      await landingPageService.deleteLandingPage('lp-1');

      expect(mockPrisma.landingPage.delete).toHaveBeenCalledWith({ where: { id: 'lp-1' } });
    });

    it('should throw NOT_FOUND for missing page', async () => {
      mockPrisma.landingPage.findUnique.mockResolvedValue(null);

      await expect(landingPageService.deleteLandingPage('missing')).rejects.toThrow(AppError);
    });
  });

  describe('generateLandingPageContent', () => {
    const mockProductWithBrand = {
      id: 'prod-1',
      brandId: 'brand-1',
      name: 'SOC Autopilot Hub',
      slug: 'soc-autopilot-hub',
      description: 'Automated SOC',
      tagline: 'Your SOC on autopilot',
      longDescription: null,
      pricing: null,
      features: null,
      testimonials: null,
      ctaText: 'Start Trial',
      ctaUrl: 'https://mktengine.dev',
      brand: { name: 'MarketingEngine', brandVoice: null, targetAudience: null },
    };

    it('should generate and upsert landing page content', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProductWithBrand);
      mockPrisma.landingPage.upsert.mockResolvedValue(mockPage);

      const result = await landingPageService.generateLandingPageContent('prod-1');

      expect(result.page).toBeDefined();
      expect(result.generatedContent).toBeDefined();
      expect(result.generatedContent.heroTitle).toBe('Automate Your SOC');
      expect(mockPrisma.landingPage.upsert).toHaveBeenCalledOnce();
    });

    it('should throw NOT_FOUND for missing product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(landingPageService.generateLandingPageContent('missing')).rejects.toThrow(AppError);
    });

    it('should handle invalid AI JSON gracefully', async () => {
      const { claudeGenerate } = await import('../../lib/ai');
      (claudeGenerate as any).mockResolvedValueOnce('Not valid JSON at all');

      mockPrisma.product.findUnique.mockResolvedValue(mockProductWithBrand);
      mockPrisma.landingPage.upsert.mockResolvedValue(mockPage);

      const result = await landingPageService.generateLandingPageContent('prod-1');

      expect(result.generatedContent).toEqual({ rawContent: 'Not valid JSON at all' });
    });
  });
});
