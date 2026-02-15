import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { claudeGenerate } from '../lib/ai';
import type { BrandVoiceConfig } from '@mktengine/shared';

type RepurposeFormat = 'thread' | 'blog-draft' | 'newsletter' | 'carousel';

// ─── Repurpose a Content Piece ──────────────────────────────

export async function repurposePiece(
  pieceId: string,
  targetFormats: RepurposeFormat[],
) {
  const piece = await prisma.contentPiece.findFirst({
    where: { id: pieceId },
    include: {
      brand: {
        select: { id: true, name: true, brandVoice: true, targetAudience: true },
      },
    },
  });
  if (!piece) throw new AppError(404, 'NOT_FOUND', 'Content piece introuvable');

  const voice = piece.brand.brandVoice as BrandVoiceConfig | null;
  const voiceSummary = voice
    ? `Ton: ${voice.tone.join(', ')}. Formalité: ${voice.languageStyle.formality}.`
    : 'professionnel et engageant';

  const results = [];

  for (const format of targetFormats) {
    const repurposed = await repurposeToFormat(piece, format, voiceSummary);
    results.push(repurposed);
  }

  return results;
}

async function repurposeToFormat(
  piece: {
    id: string;
    brandId: string;
    title: string;
    body: string;
    hashtags: unknown;
    platform: string;
    brand: { id: string; name: string; targetAudience: unknown };
  },
  format: RepurposeFormat,
  voiceSummary: string,
) {
  const formatConfig = FORMAT_CONFIGS[format];
  const hashtags = Array.isArray(piece.hashtags) ? (piece.hashtags as string[]).join(' ') : '';

  const aiResponse = await claudeGenerate(
    `Tu es un expert marketing. Repurpose ce contenu ${piece.platform} en format "${formatConfig.label}".
${formatConfig.prompt}
- Voix de marque: ${voiceSummary}
- Audience: ${JSON.stringify(piece.brand.targetAudience ?? 'PME tech')}

Retourne un JSON avec:
{
  "title": "titre adapté au format",
  "body": "contenu complet au format demandé",
  "hashtags": ["#tag1", "#tag2"],
  "callToAction": "CTA adapté"
}
Réponds uniquement avec le JSON.`,
    `Contenu original (${piece.platform}):\nTitre: ${piece.title}\nBody: ${piece.body}\nHashtags: ${hashtags}`,
  );

  let content: { title: string; body: string; hashtags: string[]; callToAction: string };
  try {
    content = JSON.parse(aiResponse);
  } catch {
    content = {
      title: `[${formatConfig.label}] ${piece.title}`,
      body: piece.body,
      hashtags: Array.isArray(piece.hashtags) ? piece.hashtags as string[] : [],
      callToAction: '',
    };
  }

  const newPiece = await prisma.contentPiece.create({
    data: {
      brandId: piece.brandId,
      contentInputId: null,
      parentPieceId: piece.id,
      repurposeType: format,
      platform: formatConfig.platform,
      title: content.title,
      body: content.body,
      hashtags: content.hashtags,
      callToAction: content.callToAction || null,
      status: 'review',
    },
  });

  return newPiece;
}

// ─── Format Configurations ──────────────────────────────────

const FORMAT_CONFIGS: Record<RepurposeFormat, {
  label: string;
  platform: string;
  prompt: string;
}> = {
  thread: {
    label: 'Twitter Thread',
    platform: 'twitter',
    prompt: `Transforme en un thread Twitter de 5-8 tweets:
- Tweet 1: hook accrocheur (max 280 chars)
- Tweets 2-7: un point clé par tweet, numéroté
- Dernier tweet: CTA + rappel de suivre
Sépare chaque tweet par "---" dans le body.
Chaque tweet doit être autonome et engageant.`,
  },
  'blog-draft': {
    label: 'Blog Draft',
    platform: 'linkedin',
    prompt: `Transforme en un brouillon d'article de blog (800-1200 mots):
- Titre SEO-friendly avec mot-clé principal
- Introduction accrocheuse (2-3 phrases)
- 3-5 sous-sections avec H2
- Exemples concrets et données
- Conclusion avec CTA
Format: markdown dans le body.`,
  },
  newsletter: {
    label: 'Newsletter',
    platform: 'linkedin',
    prompt: `Transforme en un segment de newsletter:
- Objet email accrocheur (dans le titre)
- Intro personnelle (1-2 phrases)
- Contenu principal restructuré pour l'email
- Bullet points pour les points clés
- CTA unique et clair
- PS. avec bonus ou urgence
Ton conversationnel, comme un email à un ami expert.`,
  },
  carousel: {
    label: 'Carousel',
    platform: 'linkedin',
    prompt: `Transforme en un carousel LinkedIn de 6-10 slides:
- Slide 1: titre accrocheur
- Slides 2-9: un point clé par slide (court, impactant)
- Dernière slide: CTA + recap
Sépare chaque slide par "---" dans le body.
Chaque slide: titre en gras + 1-2 phrases max.`,
  },
};
