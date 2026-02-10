import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import type { BrandVoiceConfig } from '@synap6ia/shared';

function jsonOrDbNull(value: string | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value ?? Prisma.JsonNull;
}

// ─── Brand Voice Validation ──────────────────────────────────

function validateBrandVoice(config: BrandVoiceConfig): string | null {
  if (!config.tone || !Array.isArray(config.tone) || config.tone.length === 0) {
    return 'tone must be a non-empty array of strings';
  }
  if (!config.vocabulary || !Array.isArray(config.vocabulary.preferred)) {
    return 'vocabulary.preferred must be an array';
  }
  if (!config.persona || !config.persona.name || !config.persona.role) {
    return 'persona must have name and role';
  }
  if (!config.languageStyle || !config.languageStyle.formality) {
    return 'languageStyle.formality is required';
  }
  const validFormalities = ['casual', 'professional', 'formal'];
  if (!validFormalities.includes(config.languageStyle.formality)) {
    return `languageStyle.formality must be one of: ${validFormalities.join(', ')}`;
  }
  return null;
}

// ─── Brands ──────────────────────────────────────────────────

export async function createBrand(
  userId: string,
  data: {
    name: string;
    brandVoice?: string;
    targetAudience?: string;
    contentGuidelines?: string;
    visualGuidelines?: string;
  },
) {
  return prisma.brand.create({
    data: {
      userId,
      name: data.name,
      brandVoice: jsonOrDbNull(data.brandVoice),
      targetAudience: jsonOrDbNull(data.targetAudience),
      contentGuidelines: jsonOrDbNull(data.contentGuidelines),
      visualGuidelines: jsonOrDbNull(data.visualGuidelines),
    },
  });
}

export async function listBrands() {
  return prisma.brand.findMany({
    include: {
      _count: { select: { products: true, socialAccounts: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getBrandById(id: string) {
  const brand = await prisma.brand.findFirst({
    where: { id },
    include: {
      products: { orderBy: { createdAt: 'desc' } },
      socialAccounts: {
        select: {
          id: true,
          platform: true,
          platformUsername: true,
          status: true,
          tokenExpiresAt: true,
          createdAt: true,
          _count: { select: { adAccounts: true } },
        },
      },
    },
  });
  if (!brand) {
    throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');
  }
  return brand;
}

export async function updateBrand(
  id: string,
  data: {
    name?: string;
    brandVoice?: string;
    targetAudience?: string;
    contentGuidelines?: string;
    visualGuidelines?: string;
  },
) {
  const brand = await prisma.brand.findFirst({ where: { id } });
  if (!brand) {
    throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');
  }
  return prisma.brand.update({ where: { id }, data });
}

export async function updateBrandVoice(id: string, voiceConfig: BrandVoiceConfig) {
  const brand = await prisma.brand.findFirst({ where: { id } });
  if (!brand) {
    throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');
  }

  const validationError = validateBrandVoice(voiceConfig);
  if (validationError) {
    throw new AppError(400, 'VALIDATION_ERROR', `Brand voice invalide: ${validationError}`);
  }

  return prisma.brand.update({
    where: { id },
    data: { brandVoice: voiceConfig as unknown as Prisma.InputJsonValue },
  });
}

export async function deleteBrand(id: string) {
  const brand = await prisma.brand.findFirst({ where: { id } });
  if (!brand) {
    throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');
  }
  await prisma.brand.delete({ where: { id } });
}

// ─── Products ────────────────────────────────────────────────

export async function createProduct(
  data: { brandId: string; name: string; description?: string },
) {
  // Verify brand exists
  const brand = await prisma.brand.findFirst({
    where: { id: data.brandId },
  });
  if (!brand) {
    throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');
  }

  return prisma.product.create({
    data: {
      brandId: data.brandId,
      name: data.name,
      description: data.description ?? null,
    },
  });
}

export async function listProducts(brandId: string) {
  // Verify brand exists
  const brand = await prisma.brand.findFirst({ where: { id: brandId } });
  if (!brand) {
    throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');
  }

  return prisma.product.findMany({
    where: { brandId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateProduct(
  id: string,
  data: { name?: string; description?: string },
) {
  const product = await prisma.product.findFirst({
    where: { id },
  });
  if (!product) {
    throw new AppError(404, 'NOT_FOUND', 'Produit introuvable');
  }
  return prisma.product.update({ where: { id }, data });
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findFirst({
    where: { id },
  });
  if (!product) {
    throw new AppError(404, 'NOT_FOUND', 'Produit introuvable');
  }
  await prisma.product.delete({ where: { id } });
}
