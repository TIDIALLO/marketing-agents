import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { claudeGenerate } from '../lib/ai';

// ─── Products CRUD ──────────────────────────────────────────

export async function createProduct(data: {
  brandId: string;
  name: string;
  slug?: string;
  description?: string;
  tagline?: string;
  longDescription?: string;
  pricing?: unknown;
  features?: unknown;
  ctaText?: string;
  ctaUrl?: string;
}) {
  const brand = await prisma.brand.findFirst({ where: { id: data.brandId } });
  if (!brand) throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');

  const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return prisma.product.create({
    data: {
      brandId: data.brandId,
      name: data.name,
      slug,
      description: data.description ?? null,
      tagline: data.tagline ?? null,
      longDescription: data.longDescription ?? null,
      pricing: (data.pricing as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      features: (data.features as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      ctaText: data.ctaText ?? null,
      ctaUrl: data.ctaUrl ?? null,
    },
  });
}

export async function listProducts(brandId?: string) {
  return prisma.product.findMany({
    where: {
      ...(brandId ? { brandId } : {}),
      isActive: true,
    },
    include: { brand: { select: { id: true, name: true } } },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      brand: { select: { id: true, name: true } },
      landingPages: { where: { isPublished: true }, select: { id: true, slug: true, title: true } },
    },
  });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Produit introuvable');
  return product;
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { brand: { select: { id: true, name: true } } },
  });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Produit introuvable');
  return product;
}

export async function updateProduct(
  id: string,
  data: {
    name?: string;
    slug?: string;
    description?: string;
    tagline?: string;
    longDescription?: string;
    pricing?: unknown;
    features?: unknown;
    testimonials?: unknown;
    ctaText?: string;
    ctaUrl?: string;
    isActive?: boolean;
    sortOrder?: number;
  },
) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Produit introuvable');

  return prisma.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.tagline !== undefined ? { tagline: data.tagline } : {}),
      ...(data.longDescription !== undefined ? { longDescription: data.longDescription } : {}),
      ...(data.pricing !== undefined ? { pricing: data.pricing as Prisma.InputJsonValue } : {}),
      ...(data.features !== undefined ? { features: data.features as Prisma.InputJsonValue } : {}),
      ...(data.testimonials !== undefined ? { testimonials: data.testimonials as Prisma.InputJsonValue } : {}),
      ...(data.ctaText !== undefined ? { ctaText: data.ctaText } : {}),
      ...(data.ctaUrl !== undefined ? { ctaUrl: data.ctaUrl } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Produit introuvable');
  await prisma.product.delete({ where: { id } });
}

// ─── AI Content Generation ──────────────────────────────────

export async function generateProductContent(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { brand: { select: { name: true, brandVoice: true, targetAudience: true } } },
  });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Produit introuvable');

  const aiResponse = await claudeGenerate(
    `Tu es un expert en copywriting B2B tech. Génère du contenu marketing complet pour ce produit.

Retourne un JSON:
{
  "tagline": "une phrase d'accroche percutante (max 80 car)",
  "description": "description courte (2-3 phrases)",
  "longDescription": "description détaillée en markdown (problème, solution, résultats, 300-500 mots)",
  "features": [
    { "icon": "nom_icone", "title": "titre feature", "description": "description courte" }
  ],
  "ctaText": "texte du bouton CTA",
  "seoTitle": "titre SEO (max 60 car)",
  "seoDescription": "meta description (max 155 car)"
}
Réponds uniquement avec le JSON.`,
    `Marque: ${product.brand.name}
Voix: ${JSON.stringify(product.brand.brandVoice ?? 'professionnelle, expert tech')}
Audience: ${JSON.stringify(product.brand.targetAudience ?? 'CTOs et DSI de PME')}
Produit: ${product.name}
Description actuelle: ${product.description ?? 'aucune'}
${product.longDescription ? `Description longue actuelle: ${product.longDescription.slice(0, 500)}` : ''}`,
  );

  let content: Record<string, unknown>;
  try {
    content = JSON.parse(aiResponse);
  } catch {
    content = { rawContent: aiResponse };
  }

  // Update product with generated content
  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      ...(content.tagline ? { tagline: content.tagline as string } : {}),
      ...(content.description ? { description: content.description as string } : {}),
      ...(content.longDescription ? { longDescription: content.longDescription as string } : {}),
      ...(content.features ? { features: content.features as Prisma.InputJsonValue } : {}),
      ...(content.ctaText ? { ctaText: content.ctaText as string } : {}),
    },
  });

  return { product: updated, generatedContent: content };
}
