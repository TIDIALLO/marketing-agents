import { createHash, randomBytes } from 'crypto';

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID || '';
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || '';
const TWITTER_REDIRECT_URI = process.env.TWITTER_REDIRECT_URI || 'http://localhost:4100/api/oauth/twitter/callback';
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || '';
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || '';

const TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const TWITTER_API_BASE = 'https://api.twitter.com/2';
const TWITTER_UPLOAD_BASE = 'https://upload.twitter.com/1.1';

// ─── PKCE Helpers ───────────────────────────────────────────

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9\-._~]/g, '')
    .slice(0, 128);

  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge };
}

// ─── OAuth ──────────────────────────────────────────────────

export function getTwitterAuthUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: TWITTER_CLIENT_ID,
    redirect_uri: TWITTER_REDIRECT_URI,
    scope: 'tweet.read tweet.write users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${TWITTER_AUTH_URL}?${params.toString()}`;
}

export async function exchangeTwitterCode(code: string, codeVerifier: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: TWITTER_REDIRECT_URI,
    client_id: TWITTER_CLIENT_ID,
    code_verifier: codeVerifier,
  });

  const authHeader = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64');

  const res = await fetch(TWITTER_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${authHeader}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twitter token exchange failed: ${res.status} ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshTwitterToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: TWITTER_CLIENT_ID,
  });

  const authHeader = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64');

  const res = await fetch(TWITTER_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${authHeader}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twitter token refresh failed: ${res.status} ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

// ─── Profile ────────────────────────────────────────────────

export async function getTwitterProfile(accessToken: string): Promise<{
  id: string;
  username: string;
  name: string;
}> {
  const res = await fetch(`${TWITTER_API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twitter profile fetch failed: ${res.status} ${err}`);
  }

  const data = await res.json() as {
    data: { id: string; username: string; name: string };
  };

  return data.data;
}

// ─── Publishing ─────────────────────────────────────────────

export async function publishTweet(
  accessToken: string,
  text: string,
  mediaId?: string,
): Promise<string> {
  const tweetData: Record<string, unknown> = { text };
  if (mediaId) {
    tweetData.media = { media_ids: [mediaId] };
  }

  const res = await fetch(`${TWITTER_API_BASE}/tweets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tweetData),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twitter publish failed: ${res.status} ${err}`);
  }

  const data = await res.json() as { data: { id: string } };
  return data.data.id;
}

// ─── Media Upload (v1.1 — requires OAuth 1.0a or app-level credentials) ──

/**
 * Upload media to Twitter. Requires TWITTER_API_KEY and TWITTER_API_SECRET.
 * Uses the v1.1 media upload endpoint with simple upload (< 5MB).
 * For larger files, chunked upload would be needed.
 */
export async function uploadTwitterMedia(
  accessToken: string,
  imageBuffer: Buffer,
  mimeType: string = 'image/png',
): Promise<string> {
  if (!TWITTER_API_KEY || !TWITTER_API_SECRET) {
    throw new Error('Twitter media upload requires TWITTER_API_KEY and TWITTER_API_SECRET');
  }

  const base64Data = imageBuffer.toString('base64');

  const res = await fetch(`${TWITTER_UPLOAD_BASE}/media/upload.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      media_data: base64Data,
      media_category: mimeType.startsWith('video/') ? 'tweet_video' : 'tweet_image',
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twitter media upload failed: ${res.status} ${err}`);
  }

  const data = await res.json() as { media_id_string: string };
  return data.media_id_string;
}

// ─── Metrics ────────────────────────────────────────────────

export async function getTweetMetrics(
  accessToken: string,
  tweetId: string,
): Promise<{
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
}> {
  const res = await fetch(
    `${TWITTER_API_BASE}/tweets/${tweetId}?tweet.fields=public_metrics`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    return { impressions: 0, likes: 0, retweets: 0, replies: 0, quotes: 0 };
  }

  const data = await res.json() as {
    data: {
      public_metrics: {
        impression_count: number;
        like_count: number;
        retweet_count: number;
        reply_count: number;
        quote_count: number;
      };
    };
  };

  const m = data.data.public_metrics;
  return {
    impressions: m.impression_count ?? 0,
    likes: m.like_count ?? 0,
    retweets: m.retweet_count ?? 0,
    replies: m.reply_count ?? 0,
    quotes: m.quote_count ?? 0,
  };
}
