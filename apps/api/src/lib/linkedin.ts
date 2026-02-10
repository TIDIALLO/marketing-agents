const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:4100/api/oauth/linkedin/callback';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_API_BASE = 'https://api.linkedin.com';
const LINKEDIN_VERSION = '202401';

// ─── OAuth ──────────────────────────────────────────────────

export function getLinkedInAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: LINKEDIN_REDIRECT_URI,
    state,
    scope: 'openid profile w_member_social',
  });
  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

export async function exchangeLinkedInCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: LINKEDIN_REDIRECT_URI,
    client_id: LINKEDIN_CLIENT_ID,
    client_secret: LINKEDIN_CLIENT_SECRET,
  });

  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn token exchange failed: ${res.status} ${err}`);
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

export async function refreshLinkedInToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: LINKEDIN_CLIENT_ID,
    client_secret: LINKEDIN_CLIENT_SECRET,
  });

  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn token refresh failed: ${res.status} ${err}`);
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

export async function getLinkedInProfile(accessToken: string): Promise<{
  sub: string;
  name: string;
  picture?: string;
}> {
  const res = await fetch(`${LINKEDIN_API_BASE}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn profile fetch failed: ${res.status} ${err}`);
  }

  const data = await res.json() as {
    sub: string;
    name: string;
    picture?: string;
  };

  return { sub: data.sub, name: data.name, picture: data.picture };
}

// ─── Image Upload (2-step: registerUpload → PUT binary) ─────

export async function uploadLinkedInImage(
  accessToken: string,
  authorUrn: string,
  imageBuffer: Buffer,
): Promise<string> {
  // Step 1: Register the upload
  const registerRes = await fetch(`${LINKEDIN_API_BASE}/rest/images?action=initializeUpload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': LINKEDIN_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: authorUrn,
      },
    }),
  });

  if (!registerRes.ok) {
    const err = await registerRes.text();
    throw new Error(`LinkedIn image register failed: ${registerRes.status} ${err}`);
  }

  const registerData = await registerRes.json() as {
    value: {
      uploadUrl: string;
      image: string;
    };
  };

  const { uploadUrl, image: imageUrn } = registerData.value;

  // Step 2: Upload the binary image
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: imageBuffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`LinkedIn image upload failed: ${uploadRes.status} ${err}`);
  }

  return imageUrn;
}

// ─── Publishing (Posts API — replaces deprecated ugcPosts) ───

export async function publishLinkedInPost(
  accessToken: string,
  authorUrn: string,
  text: string,
  imageUrl?: string,
  imageBuffer?: Buffer,
  profileType: string = 'person',
): Promise<string> {
  const author = authorUrn.startsWith('urn:') ? authorUrn : `urn:li:${profileType}:${authorUrn}`;

  // If we have an image buffer, upload it first
  let imageUrn: string | undefined;
  if (imageBuffer) {
    imageUrn = await uploadLinkedInImage(accessToken, author, imageBuffer);
  }

  const postData: Record<string, unknown> = {
    author,
    commentary: text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
  };

  // Attach image if uploaded or URL provided
  if (imageUrn) {
    postData.content = {
      media: {
        id: imageUrn,
        title: '',
      },
    };
  } else if (imageUrl) {
    postData.content = {
      article: {
        source: imageUrl,
        title: '',
      },
    };
  }

  const res = await fetch(`${LINKEDIN_API_BASE}/rest/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': LINKEDIN_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postData),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn publish failed: ${res.status} ${err}`);
  }

  // Posts API returns the post URN in x-restli-id header
  const postUrn = res.headers.get('x-restli-id') || '';
  return postUrn;
}

// ─── Metrics ────────────────────────────────────────────────

export async function getLinkedInPostStats(
  accessToken: string,
  shareUrn: string,
  profileType: string = 'person',
): Promise<{
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagements: number;
}> {
  if (profileType === 'organization') {
    // Organization pages: use organizationalEntityShareStatistics
    return getLinkedInOrgStats(accessToken, shareUrn);
  }

  // Personal profiles: use socialActions (limited metrics available)
  return getLinkedInSocialActions(accessToken, shareUrn);
}

async function getLinkedInOrgStats(
  accessToken: string,
  shareUrn: string,
): Promise<{
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagements: number;
}> {
  const encodedUrn = encodeURIComponent(shareUrn);
  const res = await fetch(
    `${LINKEDIN_API_BASE}/v2/organizationalEntityShareStatistics?q=organizationalEntity&shares=List(${encodedUrn})`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    return getLinkedInSocialActions(accessToken, shareUrn);
  }

  const data = await res.json() as {
    elements?: Array<{
      totalShareStatistics: {
        impressionCount: number;
        likeCount: number;
        commentCount: number;
        shareCount: number;
        clickCount: number;
        engagementCount: number;
      };
    }>;
  };

  const stats = data.elements?.[0]?.totalShareStatistics;
  if (!stats) {
    return { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0, engagements: 0 };
  }

  return {
    impressions: stats.impressionCount ?? 0,
    likes: stats.likeCount ?? 0,
    comments: stats.commentCount ?? 0,
    shares: stats.shareCount ?? 0,
    clicks: stats.clickCount ?? 0,
    engagements: stats.engagementCount ?? 0,
  };
}

async function getLinkedInSocialActions(
  accessToken: string,
  shareUrn: string,
): Promise<{
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagements: number;
}> {
  const encodedUrn = encodeURIComponent(shareUrn);
  const res = await fetch(
    `${LINKEDIN_API_BASE}/v2/socialActions/${encodedUrn}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    return { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0, engagements: 0 };
  }

  const data = await res.json() as {
    likesSummary?: { totalLikes: number };
    commentsSummary?: { totalFirstLevelComments: number };
  };

  const likes = data.likesSummary?.totalLikes ?? 0;
  const comments = data.commentsSummary?.totalFirstLevelComments ?? 0;

  return {
    impressions: 0, // Not available via socialActions for personal profiles
    likes,
    comments,
    shares: 0,
    clicks: 0,
    engagements: likes + comments,
  };
}
