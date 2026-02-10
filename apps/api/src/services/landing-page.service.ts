import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { claudeGenerate } from '../lib/ai';

// ─── Landing Pages CRUD ─────────────────────────────────────

export async function createLandingPage(data: {
  brandId: string;
  productId?: string;
  slug: string;
  title: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroCtaText?: string;
  heroCtaUrl?: string;
  sections?: unknown;
  seoTitle?: string;
  seoDescription?: string;
}) {
  const brand = await prisma.brand.findFirst({ where: { id: data.brandId } });
  if (!brand) throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');

  return prisma.landingPage.create({
    data: {
      brandId: data.brandId,
      productId: data.productId ?? null,
      slug: data.slug,
      title: data.title,
      heroTitle: data.heroTitle ?? null,
      heroSubtitle: data.heroSubtitle ?? null,
      heroCtaText: data.heroCtaText ?? null,
      heroCtaUrl: data.heroCtaUrl ?? null,
      sections: (data.sections as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
    },
  });
}

export async function listLandingPages(brandId?: string) {
  return prisma.landingPage.findMany({
    where: brandId ? { brandId } : {},
    include: {
      brand: { select: { id: true, name: true } },
      product: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getLandingPageById(id: string) {
  const page = await prisma.landingPage.findUnique({
    where: { id },
    include: {
      brand: { select: { id: true, name: true } },
      product: true,
    },
  });
  if (!page) throw new AppError(404, 'NOT_FOUND', 'Landing page introuvable');
  return page;
}

export async function getLandingPageBySlug(slug: string) {
  const page = await prisma.landingPage.findUnique({
    where: { slug },
    include: {
      brand: { select: { id: true, name: true } },
      product: true,
    },
  });
  if (!page) throw new AppError(404, 'NOT_FOUND', 'Landing page introuvable');
  if (!page.isPublished) throw new AppError(404, 'NOT_FOUND', 'Landing page introuvable');
  return page;
}

export async function updateLandingPage(
  id: string,
  data: {
    title?: string;
    slug?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    heroCtaText?: string;
    heroCtaUrl?: string;
    sections?: unknown;
    seoTitle?: string;
    seoDescription?: string;
  },
) {
  const page = await prisma.landingPage.findUnique({ where: { id } });
  if (!page) throw new AppError(404, 'NOT_FOUND', 'Landing page introuvable');

  return prisma.landingPage.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.heroTitle !== undefined ? { heroTitle: data.heroTitle } : {}),
      ...(data.heroSubtitle !== undefined ? { heroSubtitle: data.heroSubtitle } : {}),
      ...(data.heroCtaText !== undefined ? { heroCtaText: data.heroCtaText } : {}),
      ...(data.heroCtaUrl !== undefined ? { heroCtaUrl: data.heroCtaUrl } : {}),
      ...(data.sections !== undefined ? { sections: data.sections as Prisma.InputJsonValue } : {}),
      ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
      ...(data.seoDescription !== undefined ? { seoDescription: data.seoDescription } : {}),
    },
  });
}

export async function publishLandingPage(id: string) {
  const page = await prisma.landingPage.findUnique({ where: { id } });
  if (!page) throw new AppError(404, 'NOT_FOUND', 'Landing page introuvable');

  return prisma.landingPage.update({
    where: { id },
    data: { isPublished: true },
  });
}

export async function unpublishLandingPage(id: string) {
  const page = await prisma.landingPage.findUnique({ where: { id } });
  if (!page) throw new AppError(404, 'NOT_FOUND', 'Landing page introuvable');

  return prisma.landingPage.update({
    where: { id },
    data: { isPublished: false },
  });
}

export async function deleteLandingPage(id: string) {
  const page = await prisma.landingPage.findUnique({ where: { id } });
  if (!page) throw new AppError(404, 'NOT_FOUND', 'Landing page introuvable');
  await prisma.landingPage.delete({ where: { id } });
}

// ─── AI Landing Page Generation ─────────────────────────────

export async function generateLandingPageContent(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { brand: { select: { name: true, brandVoice: true, targetAudience: true } } },
  });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Produit introuvable');

  const aiResponse = await claudeGenerate(
    `Tu es un expert en conversion et landing pages B2B tech. Génère le contenu complet pour une landing page de vente.

Retourne un JSON:
{
  "heroTitle": "titre principal accrocheur (max 80 car)",
  "heroSubtitle": "sous-titre qui explique la proposition de valeur (max 150 car)",
  "heroCtaText": "texte du bouton CTA (max 30 car)",
  "seoTitle": "titre SEO (max 60 car)",
  "seoDescription": "meta description (max 155 car)",
  "sections": [
    { "type": "problem", "title": "Le problème", "content": "description du problème que le produit résout" },
    { "type": "solution", "title": "La solution", "content": "comment le produit résout le problème" },
    { "type": "features", "title": "Fonctionnalités", "items": [{ "title": "...", "description": "..." }] },
    { "type": "testimonials", "title": "Ils nous font confiance", "items": [{ "name": "...", "company": "...", "quote": "..." }] },
    { "type": "pricing", "title": "Tarifs", "content": "appel à l'action pricing" },
    { "type": "faq", "title": "Questions fréquentes", "items": [{ "question": "...", "answer": "..." }] },
    { "type": "cta", "title": "Prêt à commencer ?", "content": "dernier appel à l'action" }
  ]
}
Réponds uniquement avec le JSON.`,
    `Marque: ${product.brand.name}
Voix: ${JSON.stringify(product.brand.brandVoice ?? 'professionnelle')}
Audience: ${JSON.stringify(product.brand.targetAudience ?? 'PME')}
Produit: ${product.name}
Tagline: ${product.tagline ?? ''}
Description: ${product.description ?? ''}
${product.longDescription ? `Description longue: ${product.longDescription.slice(0, 500)}` : ''}
${product.pricing ? `Pricing: ${JSON.stringify(product.pricing)}` : ''}
${product.features ? `Features: ${JSON.stringify(product.features)}` : ''}
${product.testimonials ? `Testimonials: ${JSON.stringify(product.testimonials)}` : ''}`,
  );

  let content: Record<string, unknown>;
  try {
    content = JSON.parse(aiResponse);
  } catch {
    content = { rawContent: aiResponse };
  }

  // Create or update landing page
  const slug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const page = await prisma.landingPage.upsert({
    where: { slug },
    create: {
      brandId: product.brandId,
      productId: product.id,
      slug,
      title: product.name,
      heroTitle: (content.heroTitle as string) ?? product.tagline ?? product.name,
      heroSubtitle: (content.heroSubtitle as string) ?? product.description ?? '',
      heroCtaText: (content.heroCtaText as string) ?? product.ctaText ?? 'Commencer',
      heroCtaUrl: product.ctaUrl ?? '#',
      sections: (content.sections as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      seoTitle: (content.seoTitle as string) ?? product.name,
      seoDescription: (content.seoDescription as string) ?? product.description ?? '',
    },
    update: {
      heroTitle: (content.heroTitle as string) ?? undefined,
      heroSubtitle: (content.heroSubtitle as string) ?? undefined,
      heroCtaText: (content.heroCtaText as string) ?? undefined,
      sections: (content.sections as Prisma.InputJsonValue) ?? undefined,
      seoTitle: (content.seoTitle as string) ?? undefined,
      seoDescription: (content.seoDescription as string) ?? undefined,
    },
  });

  return { page, generatedContent: content };
}
