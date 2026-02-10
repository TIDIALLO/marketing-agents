import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { claudeGenerate } from '../lib/ai';
import { renderTemplate, listTemplates, getTemplate, PLATFORM_DIMENSIONS } from '../lib/visual-generator';

const VISUAL_STORAGE_PATH = process.env.VISUAL_STORAGE_PATH || join(__dirname, '..', '..', 'data', 'visuals');
const VISUAL_PUBLIC_URL = process.env.VISUAL_PUBLIC_URL || '/visuals';

// Ensure storage directory exists
if (!existsSync(VISUAL_STORAGE_PATH)) {
  mkdirSync(VISUAL_STORAGE_PATH, { recursive: true });
}

// ─── Generate Visual from Template ──────────────────────────

export async function generateVisualFromTemplate(
  pieceId: string,
  templateId: string,
  overrides?: Record<string, string>,
): Promise<{ mediaUrl: string; templateId: string; templateData: Record<string, string> }> {
  const piece = await prisma.contentPiece.findFirst({
    where: { id: pieceId },
    include: {
      brand: {
        select: { id: true, name: true, visualGuidelines: true, brandVoice: true },
      },
    },
  });
  if (!piece) throw new AppError(404, 'NOT_FOUND', 'Content piece introuvable');

  const template = getTemplate(templateId);
  if (!template) throw new AppError(400, 'VALIDATION_ERROR', `Template "${templateId}" introuvable`);

  // Get brand color from visual guidelines or default
  const guidelines = piece.brand.visualGuidelines as Record<string, unknown> | null;
  const brandColor = (guidelines?.primaryColor as string) || '#6366f1';

  // Build variables from piece data + overrides
  const variables: Record<string, string> = {
    brandName: piece.brand.name,
    brandColor,
    ...overrides,
  };

  // Auto-fill common variables from piece data if not overridden
  if (!variables.quote && !variables.title) {
    variables.title = piece.title;
  }
  if (!variables.content && !variables.description) {
    variables.content = piece.body.slice(0, 200);
  }

  // Render the template
  const imageBuffer = await renderTemplate(templateId, variables, piece.platform);

  // Save to disk
  const filename = `${pieceId}-${templateId}-${Date.now()}.png`;
  const filepath = join(VISUAL_STORAGE_PATH, filename);
  writeFileSync(filepath, imageBuffer);

  const mediaUrl = `${VISUAL_PUBLIC_URL}/${filename}`;

  // Update piece with template info
  await prisma.contentPiece.update({
    where: { id: pieceId },
    data: {
      mediaUrl,
      templateId,
      templateData: variables as Record<string, string>,
    },
  });

  return { mediaUrl, templateId, templateData: variables };
}

// ─── Suggest Template via Claude ────────────────────────────

export async function suggestTemplate(
  pieceId: string,
): Promise<{ templateId: string; variables: Record<string, string> }> {
  const piece = await prisma.contentPiece.findFirst({
    where: { id: pieceId },
    include: {
      brand: { select: { name: true, visualGuidelines: true } },
    },
  });
  if (!piece) throw new AppError(404, 'NOT_FOUND', 'Content piece introuvable');

  const templates = listTemplates()
    .filter((t) => t.bestFor.includes(piece.platform))
    .map((t) => ({ id: t.id, name: t.name, description: t.description, variables: t.variables }));

  const aiResponse = await claudeGenerate(
    `Tu es un expert en marketing visuel. Analyse ce contenu et choisis le meilleur template visuel parmi les options disponibles.
Retourne un JSON avec: { "templateId": "...", "variables": { ... } }
Remplis les variables du template choisi avec du contenu pertinent extrait du post.
Templates disponibles: ${JSON.stringify(templates)}
Réponds uniquement avec le JSON.`,
    `Plateforme: ${piece.platform}
Titre: ${piece.title}
Body: ${piece.body.slice(0, 500)}
Marque: ${piece.brand.name}`,
  );

  try {
    return JSON.parse(aiResponse);
  } catch {
    // Default to quote-card
    return {
      templateId: 'quote-card',
      variables: {
        quote: piece.title,
        author: piece.brand.name,
        role: '',
      },
    };
  }
}

// ─── Get Visual Buffer for Upload ───────────────────────────

export async function getVisualBuffer(pieceId: string): Promise<Buffer | null> {
  const piece = await prisma.contentPiece.findFirst({
    where: { id: pieceId },
    select: { templateId: true, templateData: true, platform: true },
  });

  if (!piece?.templateId || !piece.templateData) return null;

  const variables = piece.templateData as Record<string, string>;
  return renderTemplate(piece.templateId, variables, piece.platform);
}

// ─── List Templates (public API) ─────────────────────────────

export { listTemplates };
export { PLATFORM_DIMENSIONS };
