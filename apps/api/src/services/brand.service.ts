import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

function jsonOrDbNull(value: string | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value ?? Prisma.JsonNull;
}

// ─── Brands ──────────────────────────────────────────────────

export async function createBrand(
  tenantId: string,
  data: {
    organizationId: string;
    name: string;
    brandVoice?: string;
    targetAudience?: string;
    contentGuidelines?: string;
    visualGuidelines?: string;
  },
) {
  // Verify organization belongs to tenant
  const org = await prisma.organization.findFirst({
    where: { id: data.organizationId, tenantId },
  });
  if (!org) {
    throw new AppError(404, 'NOT_FOUND', 'Organisation introuvable');
  }

  return prisma.brand.create({
    data: {
      tenantId,
      organizationId: data.organizationId,
      name: data.name,
      brandVoice: jsonOrDbNull(data.brandVoice),
      targetAudience: jsonOrDbNull(data.targetAudience),
      contentGuidelines: jsonOrDbNull(data.contentGuidelines),
      visualGuidelines: jsonOrDbNull(data.visualGuidelines),
    },
  });
}

export async function listBrands(tenantId: string) {
  return prisma.brand.findMany({
    where: { tenantId },
    include: {
      organization: { select: { id: true, name: true } },
      _count: { select: { products: true, socialAccounts: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getBrandById(tenantId: string, id: string) {
  const brand = await prisma.brand.findFirst({
    where: { id, tenantId },
    include: {
      organization: { select: { id: true, name: true } },
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
  tenantId: string,
  id: string,
  data: {
    name?: string;
    brandVoice?: string;
    targetAudience?: string;
    contentGuidelines?: string;
    visualGuidelines?: string;
  },
) {
  const brand = await prisma.brand.findFirst({ where: { id, tenantId } });
  if (!brand) {
    throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');
  }
  return prisma.brand.update({ where: { id }, data });
}

export async function deleteBrand(tenantId: string, id: string) {
  const brand = await prisma.brand.findFirst({ where: { id, tenantId } });
  if (!brand) {
    throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');
  }
  await prisma.brand.delete({ where: { id } });
}

// ─── Products ────────────────────────────────────────────────

export async function createProduct(
  tenantId: string,
  data: { brandId: string; name: string; description?: string },
) {
  // Verify brand belongs to tenant
  const brand = await prisma.brand.findFirst({
    where: { id: data.brandId, tenantId },
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

export async function listProducts(tenantId: string, brandId: string) {
  // Verify brand belongs to tenant
  const brand = await prisma.brand.findFirst({ where: { id: brandId, tenantId } });
  if (!brand) {
    throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');
  }

  return prisma.product.findMany({
    where: { brandId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateProduct(
  tenantId: string,
  id: string,
  data: { name?: string; description?: string },
) {
  const product = await prisma.product.findFirst({
    where: { id },
    include: { brand: { select: { tenantId: true } } },
  });
  if (!product || product.brand.tenantId !== tenantId) {
    throw new AppError(404, 'NOT_FOUND', 'Produit introuvable');
  }
  return prisma.product.update({ where: { id }, data });
}

export async function deleteProduct(tenantId: string, id: string) {
  const product = await prisma.product.findFirst({
    where: { id },
    include: { brand: { select: { tenantId: true } } },
  });
  if (!product || product.brand.tenantId !== tenantId) {
    throw new AppError(404, 'NOT_FOUND', 'Produit introuvable');
  }
  await prisma.product.delete({ where: { id } });
}
