import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { claudeGenerate, whisperTranscribe, dalleGenerate } from '../lib/ai';
import { triggerWorkflow } from '../lib/n8n';
import { getFramework, getFrameworksForPlatform, buildFrameworkPrompt } from '../lib/copy-frameworks';
import type { Platform, BrandVoiceConfig } from '@mktengine/shared';

const PLATFORM_LIMITS: Record<string, number> = {
  linkedin: 3000,
  facebook: 500,
  instagram: 2200,
  twitter: 280,
  tiktok: 2200,
};

// ─── Brand Voice Helper ──────────────────────────────────────

function buildVoicePrompt(voice: BrandVoiceConfig | null, platform?: string): string {
  if (!voice) return 'Voix de marque: professionnelle et engageante';

  // Handle case where brandVoice is a plain string instead of structured config
  if (typeof voice === 'string') return `Voix de marque: ${voice}`;
  if (!voice.languageStyle || !voice.tone) return `Voix de marque: ${JSON.stringify(voice)}`;

  const override = platform ? voice.platformOverrides?.[platform] : undefined;

  const tone = (override && typeof override === 'object' && override.tone) ? override.tone : voice.tone;
  const formality = (override && typeof override === 'object' && override.formality) ? override.formality : voice.languageStyle.formality;
  const emoji = (override && typeof override === 'object' && override.emojiUsage) ? override.emojiUsage : voice.languageStyle.emojiUsage;

  const parts = [
    `Ton: ${tone.join(', ')}`,
    `Formalité: ${formality}`,
    `Longueur de phrases: ${voice.languageStyle.sentenceLength}`,
    `Humour: ${voice.languageStyle.humor}`,
    `Émojis: ${emoji}`,
    voice.persona ? `Persona: ${voice.persona.name} (${voice.persona.role}) — ${voice.persona.background}` : '',
    voice.vocabulary.preferred.length > 0 ? `Vocabulaire privilégié: ${voice.vocabulary.preferred.join(', ')}` : '',
    voice.vocabulary.avoided.length > 0 ? `Vocabulaire à éviter: ${voice.vocabulary.avoided.join(', ')}` : '',
    voice.examples.good.length > 0 ? `Exemples de bon contenu:\n${voice.examples.good.map((e) => `  - "${e}"`).join('\n')}` : '',
    voice.examples.bad.length > 0 ? `Exemples de contenu à éviter:\n${voice.examples.bad.map((e) => `  - "${e}"`).join('\n')}` : '',
  ].filter(Boolean);

  return `Voix de marque structurée:\n${parts.join('\n')}`;
}

// ─── Content Pillars ─────────────────────────────────────────

export async function createPillar(
  data: { brandId: string; name: string; description?: string },
) {
  const brand = await prisma.brand.findFirst({ where: { id: data.brandId } });
  if (!brand) throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');

  return prisma.contentPillar.create({
    data: { brandId: data.brandId, name: data.name, description: data.description ?? null },
  });
}

export async function listPillars(brandId?: string) {
  return prisma.contentPillar.findMany({
    where: brandId ? { brandId } : {},
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Content Inputs (Stories 3.1, 3.2) ───────────────────────

export async function createInput(
  userId: string,
  data: {
    brandId: string;
    inputType: string;
    rawContent: string;
    sourceUrl?: string;
    pillarId?: string;
  },
) {
  const brand = await prisma.brand.findFirst({ where: { id: data.brandId } });
  if (!brand) throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');

  const input = await prisma.contentInput.create({
    data: {
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
    brandId: data.brandId,
    inputType: data.inputType,
  }).catch((err) => console.error('[n8n] MKT-101 trigger failed:', err));

  return input;
}

export async function createAudioInput(
  userId: string,
  data: {
    brandId: string;
    audioBuffer: Buffer;
    filename: string;
    pillarId?: string;
  },
) {
  const brand = await prisma.brand.findFirst({
    where: { id: data.brandId },
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
    brandId: data.brandId,
    inputType: 'audio',
  }).catch((err) => console.error('[n8n] MKT-101 trigger failed:', err));

  return input;
}

export async function listInputs(
  brandId?: string,
  pagination?: { skip?: number; take?: number },
) {
  const skip = pagination?.skip ?? 0;
  const take = pagination?.take ?? 20;

  const where = { ...(brandId ? { brandId } : {}) };

  const [data, total] = await Promise.all([
    prisma.contentInput.findMany({
      where,
      include: { _count: { select: { contentPieces: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.contentInput.count({ where }),
  ]);

  return { data, total };
}

export async function getInputById(id: string) {
  const input = await prisma.contentInput.findFirst({
    where: { id },
    include: { contentPieces: { orderBy: { createdAt: 'desc' } } },
  });
  if (!input) throw new AppError(404, 'NOT_FOUND', 'Content input introuvable');
  return input;
}

// ─── AI Research & Strategy (Story 3.3) ──────────────────────

export async function runAiResearch(inputId: string) {
  const input = await prisma.contentInput.findFirst({
    where: { id: inputId },
    include: {
      brand: {
        select: { name: true, brandVoice: true, targetAudience: true, contentGuidelines: true },
      },
    },
  });
  if (!input) throw new AppError(404, 'NOT_FOUND', 'Content input introuvable');

  const voice = input.brand.brandVoice as BrandVoiceConfig | null;
  const brandContext = [
    `Marque: ${input.brand.name}`,
    buildVoicePrompt(voice),
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
    brandId: input.brandId,
    research,
  }).catch((err) => console.error('[n8n] MKT-103 trigger failed:', err));

  return updated;
}

// ─── Content Generation (Story 3.4) ──────────────────────────

export async function generateContentPiece(
  inputId: string,
  platform: Platform,
  frameworkId?: string,
) {
  const input = await prisma.contentInput.findFirst({
    where: { id: inputId },
    include: {
      brand: { select: { id: true, name: true, brandVoice: true, targetAudience: true } },
    },
  });
  if (!input) throw new AppError(404, 'NOT_FOUND', 'Content input introuvable');

  const charLimit = PLATFORM_LIMITS[platform] ?? 2200;
  const research = (input.aiResearch as Record<string, unknown>) ?? {};
  const voice = input.brand.brandVoice as BrandVoiceConfig | null;
  const voicePrompt = buildVoicePrompt(voice, platform);

  // Resolve framework
  let frameworkPrompt = '';
  let resolvedFrameworkId = frameworkId;
  if (frameworkId) {
    const fw = getFramework(frameworkId);
    if (fw) {
      frameworkPrompt = buildFrameworkPrompt(fw);
    }
  } else {
    // Suggest best frameworks for platform and let Claude choose
    const platformFrameworks = getFrameworksForPlatform(platform);
    if (platformFrameworks.length > 0) {
      frameworkPrompt = `Choisis le meilleur framework parmi: ${platformFrameworks.map((f) => f.id).join(', ')}. Indique-le dans le champ "framework" de la réponse.`;
    }
  }

  const aiResponse = await claudeGenerate(
    `Tu es un redacteur marketing expert B2B tech. Genere du contenu pour ${platform} en respectant:
- Limite: ${charLimit} caracteres max pour le body
- ${voicePrompt}
- Audience: ${JSON.stringify(input.brand.targetAudience ?? 'CTOs, DSI, responsables marketing de PME en Afrique de l\'Ouest et France')}
- Contexte: solutions tech pour PME (cybersecurite, automatisation marketing, DevOps)
${platform === 'linkedin' ? '- Format: post long avec hook accrocheur, bullet points, CTA clair' : ''}
${platform === 'twitter' ? '- Format: tweet percutant, max 280 chars, 1-2 hashtags' : ''}
${platform === 'tiktok' ? '- Format: script video 30-60 secondes' : ''}
${frameworkPrompt ? `\n${frameworkPrompt}` : ''}

Retourne un JSON avec:
{
  "title": "titre accrocheur",
  "body": "contenu complet (max ${charLimit} car)",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "callToAction": "appel a l'action",
  "mediaPrompt": "description detaillee pour generer un visuel",
  "framework": "${frameworkId || 'chosen_framework_id'}"
}
Reponds uniquement avec le JSON.`,
    `Contexte recherche: ${JSON.stringify(research)}\n\nInput original: ${input.rawContent}`,
  );

  let content: { title: string; body: string; hashtags: string[]; callToAction: string; mediaPrompt: string; framework?: string };
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

  if (!resolvedFrameworkId && content.framework) {
    resolvedFrameworkId = content.framework;
  }

  const piece = await prisma.contentPiece.create({
    data: {
      brandId: input.brand.id,
      contentInputId: inputId,
      platform,
      title: content.title,
      body: content.body,
      hashtags: content.hashtags,
      callToAction: content.callToAction || null,
      mediaPrompt: content.mediaPrompt || null,
      framework: resolvedFrameworkId || null,
      status: 'review',
    },
  });

  return piece;
}

// ─── Visual Generation (Story 3.5) ───────────────────────────

export async function generateVisual(pieceId: string) {
  const piece = await prisma.contentPiece.findFirst({
    where: { id: pieceId },
    include: { brand: { select: { id: true, visualGuidelines: true } } },
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

  // Update piece with media URL (use DALL-E URL directly)
  const updated = await prisma.contentPiece.update({
    where: { id: pieceId },
    data: { mediaUrl: imageUrl },
  });

  // Trigger MKT-104 for approval
  triggerWorkflow('mkt-104', {
    contentPieceId: pieceId,
    brandId: piece.brandId,
  }).catch((err) => console.error('[n8n] MKT-104 trigger failed:', err));

  return updated;
}

// ─── Content Pieces CRUD ─────────────────────────────────────

export async function listPieces(
  filters?: { brandId?: string; status?: string },
  pagination?: { skip?: number; take?: number },
) {
  const skip = pagination?.skip ?? 0;
  const take = pagination?.take ?? 20;

  const where = {
    ...(filters?.brandId ? { brandId: filters.brandId } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.contentPiece.findMany({
      where,
      include: {
        brand: { select: { id: true, name: true } },
        contentInput: { select: { id: true, inputType: true, rawContent: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.contentPiece.count({ where }),
  ]);

  return { data, total };
}

export async function getPieceById(id: string) {
  const piece = await prisma.contentPiece.findFirst({
    where: { id },
    include: {
      brand: { select: { id: true, name: true } },
      contentInput: { select: { id: true, inputType: true, rawContent: true, sourceUrl: true } },
      variants: true,
    },
  });
  if (!piece) throw new AppError(404, 'NOT_FOUND', 'Content piece introuvable');
  return piece;
}

export async function updatePieceStatus(id: string, status: string) {
  const piece = await prisma.contentPiece.findFirst({ where: { id } });
  if (!piece) throw new AppError(404, 'NOT_FOUND', 'Content piece introuvable');

  return prisma.contentPiece.update({
    where: { id },
    data: { status },
  });
}

export async function updatePiece(
  id: string,
  data: { title?: string; body?: string; hashtags?: string[]; callToAction?: string },
) {
  const piece = await prisma.contentPiece.findFirst({ where: { id } });
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
