import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { claudeGenerate, dalleGenerate } from '../lib/ai';
import { sendSlackNotification } from '../lib/slack';
import { decrypt, encrypt } from '../lib/encryption';
import { publishLinkedInPost, refreshLinkedInToken } from '../lib/linkedin';
import { publishTweet } from '../lib/twitter';
import { publishInstagramPost } from '../lib/instagram';
import { publishFacebookPost } from '../lib/facebook';
import { getRedis } from '../lib/redis';
import type { Platform } from '@mktengine/shared';

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
const PUBLISH_BATCH_SIZE = 3;
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export function getNextOptimalTime(platform: string): Date {
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

// ─── Token Cache + Validation ──────────────────────────────

async function getValidAccessToken(socialAccountId: string): Promise<string> {
  // 1. Check Redis cache first
  try {
    const redis = getRedis();
    const cached = await redis.get(`token:${socialAccountId}`);
    if (cached) return cached;
  } catch {
    // Redis unavailable, fall through to decrypt
  }

  // 2. Load account from DB
  const account = await prisma.socialAccount.findUnique({ where: { id: socialAccountId } });
  if (!account || !account.accessTokenEncrypted) {
    throw new Error(`Social account ${socialAccountId} not found or has no access token`);
  }

  // 3. Check token expiration and refresh if needed
  if (account.tokenExpiresAt) {
    const expiresAt = new Date(account.tokenExpiresAt).getTime();
    const now = Date.now();

    if (expiresAt < now + TOKEN_EXPIRY_BUFFER_MS) {
      // Token expired or about to expire — try refresh
      if (account.refreshTokenEncrypted) {
        try {
          const refreshToken = decrypt(account.refreshTokenEncrypted);
          const refreshed = await refreshLinkedInToken(refreshToken);

          const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
          await prisma.socialAccount.update({
            where: { id: socialAccountId },
            data: {
              accessTokenEncrypted: encrypt(refreshed.accessToken),
              refreshTokenEncrypted: refreshed.refreshToken ? encrypt(refreshed.refreshToken) : account.refreshTokenEncrypted,
              tokenExpiresAt: newExpiresAt,
            },
          });

          // Cache the new token
          try {
            const redis = getRedis();
            const ttl = Math.min(3600, refreshed.expiresIn - 300);
            if (ttl > 0) await redis.setex(`token:${socialAccountId}`, ttl, refreshed.accessToken);
          } catch { /* Redis unavailable */ }

          return refreshed.accessToken;
        } catch (err) {
          console.error(`[Token] Refresh failed for ${socialAccountId}:`, err);
          // If refresh fails and token is already expired, mark inactive
          if (expiresAt < now) {
            await prisma.socialAccount.update({
              where: { id: socialAccountId },
              data: { status: 'inactive' },
            });
            throw new Error(`Token expired and refresh failed for account ${socialAccountId}`);
          }
          // Token not yet expired, proceed with current token
        }
      } else if (expiresAt < now) {
        // No refresh token and token expired
        await prisma.socialAccount.update({
          where: { id: socialAccountId },
          data: { status: 'inactive' },
        });
        throw new Error(`Token expired with no refresh token for account ${socialAccountId}`);
      }
    }
  }

  // 4. Decrypt and cache
  let accessToken: string;
  try {
    accessToken = decrypt(account.accessTokenEncrypted);
  } catch {
    throw new Error(`Failed to decrypt access token for account ${socialAccountId}`);
  }

  // Cache in Redis
  try {
    const redis = getRedis();
    let ttl = 3600; // default 1h
    if (account.tokenExpiresAt) {
      const secsUntilExpiry = Math.floor((new Date(account.tokenExpiresAt).getTime() - Date.now()) / 1000);
      ttl = Math.min(3600, Math.max(60, secsUntilExpiry - 300));
    }
    await redis.setex(`token:${socialAccountId}`, ttl, accessToken);
  } catch { /* Redis unavailable */ }

  return accessToken;
}

// ─── Multi-Platform Adaptation (Story 4.4) ───────────────────

export async function adaptToAllPlatforms(pieceId: string) {
  const sourcePiece = await prisma.contentPiece.findFirst({
    where: { id: pieceId, status: 'approved' },
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

  // Parallelize Claude + DALL-E calls for all platforms
  const adaptationResults = await Promise.allSettled(
    targetAccounts.map(async (account) => {
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
        mediaUrl = imageUrl;
      }

      return { account, content, mediaUrl, targetPlatform };
    }),
  );

  // Create DB records sequentially (Prisma transaction safety)
  const variants = [];
  const schedules = [];

  for (const result of adaptationResults) {
    if (result.status === 'rejected') {
      console.error('[Adapt] Platform adaptation failed:', result.reason);
      continue;
    }

    const { account, content, mediaUrl, targetPlatform } = result.value;

    const variant = await prisma.contentPiece.create({
      data: {
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
  pieceId: string,
  socialAccountId: string,
  scheduledAt: Date,
) {
  const piece = await prisma.contentPiece.findFirst({
    where: { id: pieceId },
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
  filters?: { from?: Date; to?: Date; brandId?: string; status?: string },
  pagination?: { skip?: number; take?: number },
) {
  const skip = pagination?.skip ?? 0;
  const take = pagination?.take ?? 50;

  const where = {
    contentPiece: {
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
  };

  const [data, total] = await Promise.all([
    prisma.contentSchedule.findMany({
      where,
      include: {
        contentPiece: {
          select: { id: true, title: true, platform: true, status: true, mediaUrl: true, brandId: true },
        },
        socialAccount: { select: { id: true, platform: true, platformUsername: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      skip,
      take,
    }),
    prisma.contentSchedule.count({ where }),
  ]);

  return { data, total };
}

export async function updateSchedule(
  scheduleId: string,
  data: { scheduledAt?: Date },
) {
  const schedule = await prisma.contentSchedule.findFirst({
    where: { id: scheduleId },
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

  // Process in batches of PUBLISH_BATCH_SIZE
  for (let i = 0; i < dueSchedules.length; i += PUBLISH_BATCH_SIZE) {
    const batch = dueSchedules.slice(i, i + PUBLISH_BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (schedule) => {
        const postId = await publishToSocialPlatform(
          schedule.socialAccount.platform,
          schedule.socialAccount.id,
          schedule.contentPiece,
        );
        return { schedule, postId };
      }),
    );

    // Process batch results — DB updates sequential for safety
    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j]!;
      const schedule = batch[j]!;

      if (result.status === 'fulfilled') {
        await prisma.$transaction([
          prisma.contentSchedule.update({
            where: { id: schedule.id },
            data: { status: 'published', publishedAt: new Date() },
          }),
          prisma.contentPiece.update({
            where: { id: schedule.contentPieceId },
            data: { status: 'published', publishedAt: new Date(), platformPostId: result.value.postId },
          }),
        ]);

        results.push({ scheduleId: schedule.id, success: true });
      } else {
        const errorMsg = result.reason instanceof Error ? result.reason.message : 'Unknown error';
        const newRetryCount = schedule.retryCount + 1;

        if (newRetryCount >= MAX_PUBLISH_RETRIES) {
          await prisma.$transaction([
            prisma.contentSchedule.update({
              where: { id: schedule.id },
              data: { status: 'failed', lastError: errorMsg, retryCount: newRetryCount },
            }),
            prisma.contentPiece.update({
              where: { id: schedule.contentPieceId },
              data: { status: 'failed' },
            }),
          ]);

          await sendSlackNotification({
            text: `Publication échouée après ${MAX_PUBLISH_RETRIES} tentatives : "${schedule.contentPiece.title}" sur ${schedule.socialAccount.platform} — ${errorMsg}`,
          });

          results.push({ scheduleId: schedule.id, success: false, error: errorMsg });
        } else {
          // Exponential backoff capped at 2h
          const backoff = Math.min(RETRY_DELAY_MS * Math.pow(2, newRetryCount - 1), 2 * 60 * 60 * 1000);
          const retryAt = new Date(Date.now() + backoff);
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
  }

  return results;
}

// Platform API abstraction — real publishing for LinkedIn & Twitter
async function publishToSocialPlatform(
  platform: string,
  socialAccountId: string,
  piece: { title: string; body: string; hashtags: unknown; mediaUrl: string | null },
): Promise<string> {
  const hashtags = Array.isArray(piece.hashtags) ? (piece.hashtags as string[]).join(' ') : '';
  const fullText = `${piece.body}\n\n${hashtags}`.trim();

  // Get valid access token (cached + auto-refresh)
  const accessToken = await getValidAccessToken(socialAccountId);
  const account = await prisma.socialAccount.findUnique({ where: { id: socialAccountId } });
  if (!account) throw new Error(`Social account ${socialAccountId} not found`);

  switch (platform) {
    case 'linkedin': {
      // Fetch image as buffer if mediaUrl is a local/generated file
      let imageBuffer: Buffer | undefined;
      if (piece.mediaUrl) {
        try {
          const imgRes = await fetch(piece.mediaUrl);
          if (imgRes.ok) {
            imageBuffer = Buffer.from(await imgRes.arrayBuffer());
          }
        } catch {
          console.log('[LinkedIn] Could not fetch image for upload, posting without image');
        }
      }

      const shareUrn = await publishLinkedInPost(
        accessToken,
        account.platformUserId ?? '',
        fullText,
        imageBuffer ? undefined : piece.mediaUrl ?? undefined,
        imageBuffer,
        account.profileType ?? 'person',
      );
      console.log(`[LinkedIn] Published: ${shareUrn}`);
      return shareUrn;
    }

    case 'twitter': {
      // Upload media if available
      let mediaId: string | undefined;
      if (piece.mediaUrl) {
        try {
          const { uploadTwitterMedia } = await import('../lib/twitter');
          const imgRes = await fetch(piece.mediaUrl);
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            const contentType = imgRes.headers.get('content-type') || 'image/png';
            mediaId = await uploadTwitterMedia(accessToken, buffer, contentType);
          }
        } catch (err) {
          console.log('[Twitter] Media upload failed, posting without image:', err);
        }
      }

      const tweetId = await publishTweet(accessToken, fullText, mediaId);
      console.log(`[Twitter] Published: ${tweetId}`);
      return tweetId;
    }

    case 'instagram': {
      const igUserId = process.env.META_IG_USER_ID || account.platformUserId || '';
      if (!igUserId) throw new Error('META_IG_USER_ID not configured and no platformUserId on account');
      if (!piece.mediaUrl) throw new Error('Instagram requires an image URL');

      const postId = await publishInstagramPost(accessToken, igUserId, fullText, piece.mediaUrl);
      console.log(`[Instagram] Published: ${postId}`);
      return postId;
    }

    case 'facebook': {
      const pageId = process.env.META_PAGE_ID || account.platformUserId || '';
      if (!pageId) throw new Error('META_PAGE_ID not configured and no platformUserId on account');

      const postId = await publishFacebookPost(accessToken, pageId, fullText, piece.mediaUrl ?? undefined);
      console.log(`[Facebook] Published: ${postId}`);
      return postId;
    }

    default: {
      const msg = `[Publishing] Platform "${platform}" not yet supported — content not published`;
      if (process.env.NODE_ENV === 'production') {
        console.warn(msg);
      } else {
        console.log(msg);
      }
      return `unsupported-${platform}-${Date.now()}`;
    }
  }
}

// ─── Manual Single Publish ───────────────────────────────────

export async function publishSingle(scheduleId: string) {
  const schedule = await prisma.contentSchedule.findFirst({
    where: { id: scheduleId },
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
