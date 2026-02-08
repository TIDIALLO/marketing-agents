import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { sendSlackNotification } from '../lib/slack';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// ─── Token Encryption Helpers ────────────────────────────────────

function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

// ─── OAuth Token Refresh (Story 10.1 — MKT-401) ─────────────────

interface RefreshResult {
  accountId: string;
  platform: string;
  refreshed: boolean;
  error?: string;
}

export async function refreshExpiringTokens(): Promise<RefreshResult[]> {
  const expirationCutoff = new Date(Date.now() + 24 * 3600_000); // < 24h

  const expiringAccounts = await prisma.socialAccount.findMany({
    where: {
      status: 'active',
      tokenExpiresAt: { lt: expirationCutoff },
      refreshTokenEncrypted: { not: null },
    },
    include: {
      brand: { select: { name: true, tenantId: true } },
    },
  });

  const results: RefreshResult[] = [];

  for (const account of expiringAccounts) {
    try {
      const newTokens = await refreshPlatformToken(
        account.platform,
        account.refreshTokenEncrypted!,
      );

      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEncrypted: encrypt(newTokens.accessToken),
          refreshTokenEncrypted: newTokens.refreshToken ? encrypt(newTokens.refreshToken) : account.refreshTokenEncrypted,
          tokenExpiresAt: newTokens.expiresAt,
        },
      });

      results.push({ accountId: account.id, platform: account.platform, refreshed: true });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      // Urgent admin notification on failure
      await sendSlackNotification({
        text: `[URGENT] Échec refresh OAuth ${account.platform} — ${account.brand.name} (${account.platformUsername ?? account.id}): ${errorMsg}`,
      });

      results.push({ accountId: account.id, platform: account.platform, refreshed: false, error: errorMsg });
    }
  }

  if (results.length > 0) {
    const successes = results.filter((r) => r.refreshed).length;
    const failures = results.filter((r) => !r.refreshed).length;
    console.log(`[OAuth Refresh] ${successes} refreshed, ${failures} failed out of ${results.length} expiring accounts`);
  }

  return results;
}

// ─── Platform-Specific Token Refresh (mock in dev) ───────────────

interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

async function refreshPlatformToken(
  platform: string,
  _refreshTokenEncrypted: string,
): Promise<TokenResponse> {
  // In production: decrypt refresh token, call platform OAuth refresh endpoint
  // LinkedIn: POST https://www.linkedin.com/oauth/v2/accessToken (grant_type=refresh_token)
  // Facebook: GET https://graph.facebook.com/v19.0/oauth/access_token (grant_type=fb_exchange_token)
  // TikTok: POST https://open.tiktokapis.com/v2/oauth/token/ (grant_type=refresh_token)
  // Twitter: POST https://api.twitter.com/2/oauth2/token (grant_type=refresh_token)

  console.log(`[DEV] Refreshing ${platform} OAuth token (mock)`);

  return {
    accessToken: `mock_access_${platform}_${Date.now()}`,
    refreshToken: `mock_refresh_${platform}_${Date.now()}`,
    expiresAt: new Date(Date.now() + 60 * 24 * 3600_000), // 60 days
  };
}
