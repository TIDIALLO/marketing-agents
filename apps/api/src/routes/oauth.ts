import { Router } from 'express';
import { randomBytes } from 'crypto';
import { asyncHandler } from '../middleware/asyncHandler';
import { authMiddleware } from '../middleware/auth';
import { getRedis } from '../lib/redis';
import { encrypt } from '../lib/encryption';
import { prisma } from '../lib/prisma';
import {
  getLinkedInAuthUrl,
  exchangeLinkedInCode,
  getLinkedInProfile,
} from '../lib/linkedin';
import {
  getTwitterAuthUrl,
  exchangeTwitterCode,
  getTwitterProfile,
  generatePKCE,
} from '../lib/twitter';

const APP_URL = process.env.APP_URL || 'http://localhost:3100';
const OAUTH_STATE_TTL = 600; // 10 minutes

const router = Router();

// ─── LinkedIn OAuth ─────────────────────────────────────────

// GET /api/oauth/linkedin/authorize — redirect to LinkedIn consent
router.get(
  '/linkedin/authorize',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const state = randomBytes(16).toString('hex');
    const redis = getRedis();
    await redis.set(
      `oauth:linkedin:${state}`,
      JSON.stringify({ userId: req.user!.userId }),
      'EX',
      OAUTH_STATE_TTL,
    );

    const authUrl = getLinkedInAuthUrl(state);
    res.redirect(authUrl);
  }),
);

// GET /api/oauth/linkedin/callback — handle LinkedIn callback
router.get(
  '/linkedin/callback',
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;

    if (error || !code || !state) {
      return res.redirect(`${APP_URL}/settings?error=linkedin_denied`);
    }

    const redis = getRedis();
    const stateData = await redis.get(`oauth:linkedin:${state}`);
    if (!stateData) {
      return res.redirect(`${APP_URL}/settings?error=linkedin_expired`);
    }
    await redis.del(`oauth:linkedin:${state}`);

    const { userId } = JSON.parse(stateData) as { userId: string };

    // Exchange code for tokens
    const tokens = await exchangeLinkedInCode(code as string);

    // Get LinkedIn profile
    const profile = await getLinkedInProfile(tokens.accessToken);

    // Get user's brand (first brand for the user)
    const user = await prisma.platformUser.findUnique({
      where: { id: userId },
      include: {
        brands: { take: 1 },
      },
    });

    const brandId = user?.brands?.[0]?.id;
    if (!brandId) {
      return res.redirect(`${APP_URL}/settings?error=no_brand`);
    }

    // Upsert SocialAccount with encrypted tokens
    await prisma.socialAccount.upsert({
      where: { brandId_platform: { brandId, platform: 'linkedin' } },
      update: {
        platformUserId: profile.sub,
        platformUsername: profile.name,
        accessTokenEncrypted: encrypt(tokens.accessToken),
        refreshTokenEncrypted: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        status: 'active',
      },
      create: {
        brandId,
        platform: 'linkedin',
        platformUserId: profile.sub,
        platformUsername: profile.name,
        accessTokenEncrypted: encrypt(tokens.accessToken),
        refreshTokenEncrypted: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        status: 'active',
      },
    });

    res.redirect(`${APP_URL}/settings?connected=linkedin`);
  }),
);

// ─── Twitter/X OAuth ────────────────────────────────────────

// GET /api/oauth/twitter/authorize — redirect to Twitter consent (PKCE)
router.get(
  '/twitter/authorize',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const state = randomBytes(16).toString('hex');
    const { codeVerifier, codeChallenge } = generatePKCE();

    const redis = getRedis();
    await redis.set(
      `oauth:twitter:${state}`,
      JSON.stringify({
        userId: req.user!.userId,
        codeVerifier,
      }),
      'EX',
      OAUTH_STATE_TTL,
    );

    const authUrl = getTwitterAuthUrl(state, codeChallenge);
    res.redirect(authUrl);
  }),
);

// GET /api/oauth/twitter/callback — handle Twitter callback
router.get(
  '/twitter/callback',
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;

    if (error || !code || !state) {
      return res.redirect(`${APP_URL}/settings?error=twitter_denied`);
    }

    const redis = getRedis();
    const stateData = await redis.get(`oauth:twitter:${state}`);
    if (!stateData) {
      return res.redirect(`${APP_URL}/settings?error=twitter_expired`);
    }
    await redis.del(`oauth:twitter:${state}`);

    const { userId, codeVerifier } = JSON.parse(stateData) as {
      userId: string;
      codeVerifier: string;
    };

    // Exchange code for tokens (PKCE)
    const tokens = await exchangeTwitterCode(code as string, codeVerifier);

    // Get Twitter profile
    const profile = await getTwitterProfile(tokens.accessToken);

    // Get user's brand
    const user = await prisma.platformUser.findUnique({
      where: { id: userId },
      include: {
        brands: { take: 1 },
      },
    });

    const brandId = user?.brands?.[0]?.id;
    if (!brandId) {
      return res.redirect(`${APP_URL}/settings?error=no_brand`);
    }

    // Upsert SocialAccount
    await prisma.socialAccount.upsert({
      where: { brandId_platform: { brandId, platform: 'twitter' } },
      update: {
        platformUserId: profile.id,
        platformUsername: profile.username,
        accessTokenEncrypted: encrypt(tokens.accessToken),
        refreshTokenEncrypted: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        status: 'active',
      },
      create: {
        brandId,
        platform: 'twitter',
        platformUserId: profile.id,
        platformUsername: profile.username,
        accessTokenEncrypted: encrypt(tokens.accessToken),
        refreshTokenEncrypted: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        status: 'active',
      },
    });

    res.redirect(`${APP_URL}/settings?connected=twitter`);
  }),
);

export { router as oauthRoutes };
