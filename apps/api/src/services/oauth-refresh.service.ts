import { prisma } from '../lib/prisma';
import { encrypt, decrypt } from '../lib/encryption';
import { sendSlackNotification } from '../lib/slack';
import { refreshLinkedInToken } from '../lib/linkedin';
import { refreshTwitterToken } from '../lib/twitter';

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
      brand: { select: { name: true } },
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
        text: `[URGENT] Echec refresh OAuth ${account.platform} — ${account.brand.name} (${account.platformUsername ?? account.id}): ${errorMsg}`,
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

// ─── Platform-Specific Token Refresh ────────────────────────────

interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

async function refreshPlatformToken(
  platform: string,
  refreshTokenEncrypted: string,
): Promise<TokenResponse> {
  const refreshToken = decrypt(refreshTokenEncrypted);

  switch (platform) {
    case 'linkedin': {
      const result = await refreshLinkedInToken(refreshToken);
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: new Date(Date.now() + result.expiresIn * 1000),
      };
    }

    case 'twitter': {
      const result = await refreshTwitterToken(refreshToken);
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: new Date(Date.now() + result.expiresIn * 1000),
      };
    }

    default: {
      console.log(`[OAuth Refresh] Platform ${platform} not supported for refresh`);
      throw new Error(`Unsupported platform for OAuth refresh: ${platform}`);
    }
  }
}
