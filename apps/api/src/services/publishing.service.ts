import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { claudeGenerate, dalleGenerate } from '../lib/ai';
import { uploadFromUrl } from '../lib/minio';
import { sendSlackNotification } from '../lib/slack';
import type { Platform } from '@synap6ia/shared';

const PLATFORM_LIMITS: Record<string, number> = {
  linkedin: 3000,
  facebook: 500,
  instagram: 2200,
  twitter: 280,
  tiktok: 2200,
};

// Optimal posting hours per platform (UTC)
const OPTIMAL_HOURS: Record<string, number[]> = {
  linkedin: [8, 10, 12],
  facebook: [9, 13, 16],
  instagram: [11, 14, 19],
  twitter: [8, 12, 17],
  tiktok: [19, 21, 22],
};

const MAX_PUBLISH_RETRIES = 3;
const RETRY_DELAY_MS = 30 * 60 * 1000; // 30 minutes

function getNextOptimalTime(platform: string): Date {
  const hours = OPTIMAL_HOURS[platform] ?? [10, 14, 18];
  const now = new Date();
  const currentHour = now.getUTCHours();

  const nextHour = hours.find((h) => h > currentHour);
  const target = new Date(now);

  if (nextHour !== undefined) {
    target.setUTCHours(nextHour, 0, 0, 0);
  } else {
    // Tomorrow, first optimal hour
    target.setUTCDate(target.getUTCDate() + 1);
    target.setUTCHours(hours[0] ?? 10, 0, 0, 0);
  }

  return target;
}

// ─── Multi-Platform Adaptation (Story 4.4) ───────────────────

export async function adaptToAllPlatforms(tenantId: string, pieceId: string) {
  const sourcePiece = await prisma.contentPiece.findFirst({
    where: { id: pieceId, tenantId, status: 'approved' },
    include: {
      brand: {
        include: {
          socialAccounts: { where: { status: 'active' } },
        },
      },
    },
  });
  if (!sourcePiece) throw new AppError(404, 'NOT_FOUND', 'Content piece introuvable ou non approuvé');

  const sourcePlatform = sourcePiece.platform;
  const targetAccounts = sourcePiece.brand.socialAccounts.filter(
    (a) => a.platform !== sourcePlatform,
  );

  if (targetAccounts.length === 0) {
    return { source: sourcePiece, variants: [], schedules: [] };
  }

  const variants = [];
  const schedules = [];

  for (const account of targetAccounts) {
    const targetPlatform = account.platform as Platform;
    const charLimit = PLATFORM_LIMITS[targetPlatform] ?? 2200;

    // Adapt with Claude
    const adapted = await claudeGenerate(
      `Tu es un expert marketing social media. Adapte le contenu pour ${targetPlatform}.
Contraintes:
- Max ${charLimit} caractères pour le body
- Voix de marque: ${JSON.stringify(sourcePiece.brand.brandVoice ?? 'professionnelle')}
- Audience: ${JSON.stringify(sourcePiece.brand.targetAudience ?? 'PME')}
${targetPlatform === 'twitter' ? '- Concis, percutant, hashtags intégrés' : ''}
${targetPlatform === 'tiktok' ? '- Script vidéo 30-60s, hooks accrocheurs' : ''}
${targetPlatform === 'instagram' ? '- Visuel, emojis, hashtags abondants' : ''}

Retourne un JSON: { "title": "...", "body": "...(max ${charLimit} car)", "hashtags": ["..."], "callToAction": "...", "mediaPrompt": "..." }
Réponds uniquement avec le JSON.`,
      `Contenu source (${sourcePlatform}):\nTitre: ${sourcePiece.title}\nBody: ${sourcePiece.body}\nHashtags: ${JSON.stringify(sourcePiece.hashtags)}`,
    );

    let content: { title: string; body: string; hashtags: string[]; callToAction: string; mediaPrompt: string };
    try {
      content = JSON.parse(adapted);
    } catch {
      content = {
        title: sourcePiece.title,
        body: sourcePiece.body.slice(0, charLimit),
        hashtags: sourcePiece.hashtags as string[],
        callToAction: sourcePiece.callToAction ?? '',
        mediaPrompt: '',
      };
    }

    // Generate variant visual if aspect ratio differs
    let mediaUrl = sourcePiece.mediaUrl;
    const needsNewVisual = targetPlatform === 'tiktok' || targetPlatform === 'instagram';

    if (needsNewVisual && content.mediaPrompt) {
      const size = targetPlatform === 'tiktok' || targetPlatform === 'instagram'
        ? ('1024x1792' as const)
        : ('1024x1024' as const);
      const imageUrl = await dalleGenerate(content.mediaPrompt, { size });
      const date = new Date().toISOString().slice(0, 10);
      const objectPath = `${sourcePiece.brand.organizationId}/variants/${date}_${pieceId}_${targetPlatform}.png`;
      mediaUrl = await uploadFromUrl(objectPath, imageUrl);
    }

    // Create variant piece
    const variant = await prisma.contentPiece.create({
      data: {
        tenantId,
        brandId: sourcePiece.brandId,
        contentInputId: sourcePiece.contentInputId,
        parentId: sourcePiece.id,
        platform: targetPlatform,
        title: content.title,
        body: content.body,
        hashtags: content.hashtags,
        callToAction: content.callToAction || null,
        mediaUrl,
        mediaPrompt: content.mediaPrompt || null,
        status: 'scheduled',
      },
    });

    // Schedule at optimal time
    const scheduledAt = getNextOptimalTime(targetPlatform);
    const schedule = await prisma.contentSchedule.create({
      data: {
        contentPieceId: variant.id,
        socialAccountId: account.id,
        scheduledAt,
        status: 'scheduled',
      },
    });

    variants.push(variant);
    schedules.push(schedule);
  }

  // Also schedule source piece on its own platform
  const sourceAccount = sourcePiece.brand.socialAccounts.find(
    (a) => a.platform === sourcePlatform,
  );
  if (sourceAccount) {
    const sourceSchedule = await prisma.contentSchedule.create({
      data: {
        contentPieceId: sourcePiece.id,
        socialAccountId: sourceAccount.id,
        scheduledAt: getNextOptimalTime(sourcePlatform),
        status: 'scheduled',
      },
    });
    schedules.push(sourceSchedule);

    await prisma.contentPiece.update({
      where: { id: sourcePiece.id },
      data: { status: 'scheduled' },
    });
  }

  return { source: sourcePiece, variants, schedules };
}

// ─── Manual Scheduling ───────────────────────────────────────

export async function scheduleContent(
  tenantId: string,
  pieceId: string,
  socialAccountId: string,
  scheduledAt: Date,
) {
  const piece = await prisma.contentPiece.findFirst({
    where: { id: pieceId, tenantId },
  });
  if (!piece) throw new AppError(404, 'NOT_FOUND', 'Content piece introuvable');

  const schedule = await prisma.contentSchedule.create({
    data: {
      contentPieceId: pieceId,
      socialAccountId,
      scheduledAt,
      status: 'scheduled',
    },
  });

  if (piece.status === 'approved' || piece.status === 'draft') {
    await prisma.contentPiece.update({
      where: { id: pieceId },
      data: { status: 'scheduled' },
    });
  }

  return schedule;
}

// ─── List & Update Schedules (Story 4.6) ─────────────────────

export async function listSchedules(
  tenantId: string,
  filters?: { from?: Date; to?: Date; brandId?: string; status?: string },
) {
  return prisma.contentSchedule.findMany({
    where: {
      contentPiece: {
        tenantId,
        ...(filters?.brandId ? { brandId: filters.brandId } : {}),
      },
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.from || filters?.to
        ? {
            scheduledAt: {
              ...(filters?.from ? { gte: filters.from } : {}),
              ...(filters?.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    },
    include: {
      contentPiece: {
        select: { id: true, title: true, platform: true, status: true, mediaUrl: true, brandId: true },
      },
      socialAccount: { select: { id: true, platform: true, platformUsername: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });
}

export async function updateSchedule(
  tenantId: string,
  scheduleId: string,
  data: { scheduledAt?: Date },
) {
  const schedule = await prisma.contentSchedule.findFirst({
    where: { id: scheduleId, contentPiece: { tenantId } },
  });
  if (!schedule) throw new AppError(404, 'NOT_FOUND', 'Planification introuvable');
  if (schedule.status === 'published') {
    throw new AppError(400, 'ALREADY_PUBLISHED', 'Impossible de modifier une publication déjà effectuée');
  }

  return prisma.contentSchedule.update({
    where: { id: scheduleId },
    data: {
      ...(data.scheduledAt ? { scheduledAt: data.scheduledAt } : {}),
      status: 'scheduled',
    },
  });
}

// ─── Automated Publishing (Story 4.5) ────────────────────────

export async function publishScheduledContent() {
  const dueSchedules = await prisma.contentSchedule.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { lte: new Date() },
    },
    include: {
      contentPiece: true,
      socialAccount: true,
    },
  });

  const results: { scheduleId: string; success: boolean; error?: string }[] = [];

  for (const schedule of dueSchedules) {
    try {
      const postId = await publishToSocialPlatform(
        schedule.socialAccount.platform,
        schedule.socialAccount.id,
        schedule.contentPiece,
      );

      await prisma.contentSchedule.update({
        where: { id: schedule.id },
        data: { status: 'published', publishedAt: new Date() },
      });

      await prisma.contentPiece.update({
        where: { id: schedule.contentPieceId },
        data: { status: 'published', publishedAt: new Date(), platformPostId: postId },
      });

      results.push({ scheduleId: schedule.id, success: true });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      const newRetryCount = schedule.retryCount + 1;

      if (newRetryCount >= MAX_PUBLISH_RETRIES) {
        // Max retries — mark as failed, notify admin
        await prisma.contentSchedule.update({
          where: { id: schedule.id },
          data: { status: 'failed', lastError: errorMsg, retryCount: newRetryCount },
        });

        await prisma.contentPiece.update({
          where: { id: schedule.contentPieceId },
          data: { status: 'failed' },
        });

        await sendSlackNotification({
          text: `Publication échouée après ${MAX_PUBLISH_RETRIES} tentatives : "${schedule.contentPiece.title}" sur ${schedule.socialAccount.platform} — ${errorMsg}`,
        });

        results.push({ scheduleId: schedule.id, success: false, error: errorMsg });
      } else {
        // Schedule retry with backoff
        const retryAt = new Date(Date.now() + RETRY_DELAY_MS);
        await prisma.contentSchedule.update({
          where: { id: schedule.id },
          data: { scheduledAt: retryAt, lastError: errorMsg, retryCount: newRetryCount },
        });

        results.push({
          scheduleId: schedule.id,
          success: false,
          error: `Retry ${newRetryCount}/${MAX_PUBLISH_RETRIES}: ${errorMsg}`,
        });
      }
    }
  }

  return results;
}

// Platform API abstraction (dev-friendly mock)
async function publishToSocialPlatform(
  platform: string,
  socialAccountId: string,
  piece: { title: string; body: string; hashtags: unknown; mediaUrl: string | null },
): Promise<string> {
  // In production: decrypt tokens and call platform APIs
  // (LinkedIn ugcPosts, Facebook /{pageId}/feed, etc.)
  const hashtags = Array.isArray(piece.hashtags) ? (piece.hashtags as string[]).join(' ') : '';
  const fullText = `${piece.body}\n\n${hashtags}`.trim();

  console.log(`[DEV] Publishing to ${platform} via account ${socialAccountId}:`);
  console.log(`  Title: ${piece.title}`);
  console.log(`  Body: ${fullText.slice(0, 200)}...`);
  if (piece.mediaUrl) console.log(`  Media: ${piece.mediaUrl}`);

  // Return mock platform post ID
  return `mock-${platform}-${Date.now()}`;
}

// ─── Manual Single Publish ───────────────────────────────────

export async function publishSingle(tenantId: string, scheduleId: string) {
  const schedule = await prisma.contentSchedule.findFirst({
    where: { id: scheduleId, contentPiece: { tenantId } },
    include: { contentPiece: true, socialAccount: true },
  });
  if (!schedule) throw new AppError(404, 'NOT_FOUND', 'Planification introuvable');
  if (schedule.status === 'published') throw new AppError(400, 'ALREADY_PUBLISHED', 'Déjà publié');

  const postId = await publishToSocialPlatform(
    schedule.socialAccount.platform,
    schedule.socialAccount.id,
    schedule.contentPiece,
  );

  await prisma.contentSchedule.update({
    where: { id: schedule.id },
    data: { status: 'published', publishedAt: new Date() },
  });

  return prisma.contentPiece.update({
    where: { id: schedule.contentPieceId },
    data: { status: 'published', publishedAt: new Date(), platformPostId: postId },
  });
}
