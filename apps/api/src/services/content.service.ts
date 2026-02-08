import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { claudeGenerate, whisperTranscribe, dalleGenerate } from '../lib/ai';
import { uploadFromUrl } from '../lib/minio';
import { triggerWorkflow } from '../lib/n8n';
import type { Platform } from '@synap6ia/shared';

const PLATFORM_LIMITS: Record<string, number> = {
  linkedin: 3000,
  facebook: 500,
  instagram: 2200,
  twitter: 280,
  tiktok: 2200,
};

// ─── Content Pillars ─────────────────────────────────────────

export async function createPillar(
  tenantId: string,
  data: { brandId: string; name: string; description?: string },
) {
  const brand = await prisma.brand.findFirst({ where: { id: data.brandId, tenantId } });
  if (!brand) throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');

  return prisma.contentPillar.create({
    data: { tenantId, brandId: data.brandId, name: data.name, description: data.description ?? null },
  });
}

export async function listPillars(tenantId: string, brandId: string) {
  return prisma.contentPillar.findMany({
    where: { tenantId, brandId },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Content Inputs (Stories 3.1, 3.2) ───────────────────────

export async function createInput(
  tenantId: string,
  userId: string,
  data: {
    brandId: string;
    inputType: string;
    rawContent: string;
    sourceUrl?: string;
    pillarId?: string;
  },
) {
  const brand = await prisma.brand.findFirst({ where: { id: data.brandId, tenantId } });
  if (!brand) throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');

  const input = await prisma.contentInput.create({
    data: {
      tenantId,
      brandId: data.brandId,
      createdById: userId,
      inputType: data.inputType,
      rawContent: data.rawContent,
      sourceUrl: data.sourceUrl ?? null,
      pillarId: data.pillarId ?? null,
      status: 'pending',
    },
  });

  // Trigger n8n workflow MKT-101 asynchronously
  triggerWorkflow('mkt-101', {
    inputId: input.id,
    tenantId,
    brandId: data.brandId,
    inputType: data.inputType,
  }).catch((err) => console.error('[n8n] MKT-101 trigger failed:', err));

  return input;
}

export async function createAudioInput(
  tenantId: string,
  userId: string,
  data: {
    brandId: string;
    audioBuffer: Buffer;
    filename: string;
    pillarId?: string;
  },
) {
  const brand = await prisma.brand.findFirst({
    where: { id: data.brandId, tenantId },
    select: { id: true, name: true, brandVoice: true, targetAudience: true },
  });
  if (!brand) throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');

  // 1. Transcribe audio with Whisper
  const transcription = await whisperTranscribe(data.audioBuffer, data.filename);

  // 2. Generate summary and suggested topics with Claude
  const aiResponse = await claudeGenerate(
    'Tu es un expert marketing. Analyse cette transcription audio et retourne un JSON avec: { "summary": "résumé en 2-3 phrases", "suggestedTopics": ["sujet1", "sujet2", "sujet3"] }. Réponds uniquement avec le JSON.',
    `Transcription audio pour la marque "${brand.name}":\n\n${transcription}`,
  );

  let aiSummary = '';
  let aiSuggestedTopics: string[] = [];
  try {
    const parsed = JSON.parse(aiResponse);
    aiSummary = parsed.summary ?? aiResponse;
    aiSuggestedTopics = parsed.suggestedTopics ?? [];
  } catch {
    aiSummary = aiResponse;
  }

  const input = await prisma.contentInput.create({
    data: {
      tenantId,
      brandId: data.brandId,
      createdById: userId,
      inputType: 'audio',
      rawContent: transcription,
      transcription,
      aiSummary,
      aiSuggestedTopics: aiSuggestedTopics.length > 0 ? aiSuggestedTopics : Prisma.JsonNull,
      pillarId: data.pillarId ?? null,
      status: 'processed',
      processedAt: new Date(),
    },
  });

  triggerWorkflow('mkt-101', {
    inputId: input.id,
    tenantId,
    brandId: data.brandId,
    inputType: 'audio',
  }).catch((err) => console.error('[n8n] MKT-101 trigger failed:', err));

  return input;
}

export async function listInputs(tenantId: string, brandId?: string) {
  return prisma.contentInput.findMany({
    where: { tenantId, ...(brandId ? { brandId } : {}) },
    include: { _count: { select: { contentPieces: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getInputById(tenantId: string, id: string) {
  const input = await prisma.contentInput.findFirst({
    where: { id, tenantId },
    include: { contentPieces: { orderBy: { createdAt: 'desc' } } },
  });
  if (!input) throw new AppError(404, 'NOT_FOUND', 'Content input introuvable');
  return input;
}

// ─── AI Research & Strategy (Story 3.3) ──────────────────────

export async function runAiResearch(tenantId: string, inputId: string) {
  const input = await prisma.contentInput.findFirst({
    where: { id: inputId, tenantId },
    include: {
      brand: {
        select: { name: true, brandVoice: true, targetAudience: true, contentGuidelines: true },
      },
    },
  });
  if (!input) throw new AppError(404, 'NOT_FOUND', 'Content input introuvable');

  const brandContext = [
    `Marque: ${input.brand.name}`,
    input.brand.brandVoice ? `Voix de marque: ${JSON.stringify(input.brand.brandVoice)}` : '',
    input.brand.targetAudience ? `Audience cible: ${JSON.stringify(input.brand.targetAudience)}` : '',
    input.brand.contentGuidelines ? `Guidelines contenu: ${JSON.stringify(input.brand.contentGuidelines)}` : '',
  ].filter(Boolean).join('\n');

  const aiResponse = await claudeGenerate(
    `Tu es un stratège marketing expert. Analyse l'input dans le contexte de la marque et retourne un JSON avec:
{
  "topic": "sujet principal",
  "angle": "angle éditorial",
  "keyMessages": ["message clé 1", "message clé 2", "message clé 3"],
  "platforms": ["linkedin", "facebook", "instagram"],
  "formatSuggestions": ["post long", "carousel", "story"],
  "hashtagSuggestions": ["#hashtag1", "#hashtag2", "#hashtag3"]
}
Réponds uniquement avec le JSON.`,
    `${brandContext}\n\nInput (${input.inputType}): ${input.rawContent}`,
  );

  let research: Record<string, unknown> = {};
  try {
    research = JSON.parse(aiResponse);
  } catch {
    research = { rawAnalysis: aiResponse };
  }

  const updated = await prisma.contentInput.update({
    where: { id: inputId },
    data: {
      aiResearch: research as Prisma.InputJsonValue,
      status: 'researched',
      processedAt: new Date(),
    },
  });

  // Trigger MKT-103 for content generation
  triggerWorkflow('mkt-103', {
    inputId,
    tenantId,
    brandId: input.brandId,
    research,
  }).catch((err) => console.error('[n8n] MKT-103 trigger failed:', err));

  return updated;
}

// ─── Content Generation (Story 3.4) ──────────────────────────

export async function generateContentPiece(
  tenantId: string,
  inputId: string,
  platform: Platform,
) {
  const input = await prisma.contentInput.findFirst({
    where: { id: inputId, tenantId },
    include: {
      brand: { select: { id: true, name: true, brandVoice: true, targetAudience: true } },
    },
  });
  if (!input) throw new AppError(404, 'NOT_FOUND', 'Content input introuvable');

  const charLimit = PLATFORM_LIMITS[platform] ?? 2200;
  const research = (input.aiResearch as Record<string, unknown>) ?? {};

  const aiResponse = await claudeGenerate(
    `Tu es un rédacteur marketing expert. Génère du contenu pour ${platform} en respectant:
- Limite: ${charLimit} caractères max pour le body
- Voix de marque: ${JSON.stringify(input.brand.brandVoice ?? 'professionnelle et engageante')}
- Audience: ${JSON.stringify(input.brand.targetAudience ?? 'PME Afrique de l\'Ouest + France')}
${platform === 'tiktok' ? '- Format: script vidéo 30-60 secondes' : ''}

Retourne un JSON avec:
{
  "title": "titre accrocheur",
  "body": "contenu complet (max ${charLimit} car)",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "callToAction": "appel à l'action",
  "mediaPrompt": "description détaillée pour générer un visuel avec DALL-E"
}
Réponds uniquement avec le JSON.`,
    `Contexte recherche: ${JSON.stringify(research)}\n\nInput original: ${input.rawContent}`,
  );

  let content: { title: string; body: string; hashtags: string[]; callToAction: string; mediaPrompt: string };
  try {
    content = JSON.parse(aiResponse);
  } catch {
    content = {
      title: 'Contenu généré',
      body: aiResponse.slice(0, charLimit),
      hashtags: [],
      callToAction: '',
      mediaPrompt: '',
    };
  }

  const piece = await prisma.contentPiece.create({
    data: {
      tenantId,
      brandId: input.brand.id,
      contentInputId: inputId,
      platform,
      title: content.title,
      body: content.body,
      hashtags: content.hashtags,
      callToAction: content.callToAction || null,
      mediaPrompt: content.mediaPrompt || null,
      status: 'review',
    },
  });

  return piece;
}

// ─── Visual Generation (Story 3.5) ───────────────────────────

export async function generateVisual(tenantId: string, pieceId: string) {
  const piece = await prisma.contentPiece.findFirst({
    where: { id: pieceId, tenantId },
    include: { brand: { select: { id: true, organizationId: true, visualGuidelines: true } } },
  });
  if (!piece) throw new AppError(404, 'NOT_FOUND', 'Content piece introuvable');

  const prompt = piece.mediaPrompt
    ? `${piece.mediaPrompt}. Style: professionnel, moderne, marketing digital.`
    : `Illustration professionnelle pour un post ${piece.platform} intitulé "${piece.title}". Style: moderne, marketing digital.`;

  const size = piece.platform === 'instagram' && piece.title.toLowerCase().includes('story')
    ? '1024x1792' as const
    : '1024x1024' as const;

  // Generate with DALL-E
  const imageUrl = await dalleGenerate(prompt, { size });

  // Upload to MinIO
  const date = new Date().toISOString().slice(0, 10);
  const objectPath = `${piece.brand.organizationId}/originals/${date}_${pieceId}.png`;
  const storedUrl = await uploadFromUrl(objectPath, imageUrl);

  // Update piece with media URL
  const updated = await prisma.contentPiece.update({
    where: { id: pieceId },
    data: { mediaUrl: storedUrl },
  });

  // Trigger MKT-104 for approval
  triggerWorkflow('mkt-104', {
    contentPieceId: pieceId,
    tenantId,
    brandId: piece.brandId,
  }).catch((err) => console.error('[n8n] MKT-104 trigger failed:', err));

  return updated;
}

// ─── Content Pieces CRUD ─────────────────────────────────────

export async function listPieces(tenantId: string, filters?: { brandId?: string; status?: string }) {
  return prisma.contentPiece.findMany({
    where: {
      tenantId,
      ...(filters?.brandId ? { brandId: filters.brandId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: {
      brand: { select: { id: true, name: true } },
      contentInput: { select: { id: true, inputType: true, rawContent: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPieceById(tenantId: string, id: string) {
  const piece = await prisma.contentPiece.findFirst({
    where: { id, tenantId },
    include: {
      brand: { select: { id: true, name: true } },
      contentInput: true,
      variants: true,
    },
  });
  if (!piece) throw new AppError(404, 'NOT_FOUND', 'Content piece introuvable');
  return piece;
}

export async function updatePieceStatus(tenantId: string, id: string, status: string) {
  const piece = await prisma.contentPiece.findFirst({ where: { id, tenantId } });
  if (!piece) throw new AppError(404, 'NOT_FOUND', 'Content piece introuvable');

  return prisma.contentPiece.update({
    where: { id },
    data: { status },
  });
}

export async function updatePiece(
  tenantId: string,
  id: string,
  data: { title?: string; body?: string; hashtags?: string[]; callToAction?: string },
) {
  const piece = await prisma.contentPiece.findFirst({ where: { id, tenantId } });
  if (!piece) throw new AppError(404, 'NOT_FOUND', 'Content piece introuvable');

  return prisma.contentPiece.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.body !== undefined ? { body: data.body } : {}),
      ...(data.hashtags !== undefined ? { hashtags: data.hashtags } : {}),
      ...(data.callToAction !== undefined ? { callToAction: data.callToAction } : {}),
    },
  });
}
