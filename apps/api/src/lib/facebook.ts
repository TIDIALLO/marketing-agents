const META_GRAPH_URL = 'https://graph.facebook.com/v22.0';

/**
 * Publish a post to a Facebook Page via the Meta Graph API.
 * Uses /{pageId}/photos for image posts or /{pageId}/feed for text-only.
 */
export async function publishFacebookPost(
  accessToken: string,
  pageId: string,
  message: string,
  imageUrl?: string,
): Promise<string> {
  if (imageUrl) {
    // Photo post
    const res = await fetch(`${META_GRAPH_URL}/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        message,
        access_token: accessToken,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Facebook photo publish failed: ${res.status} ${err}`);
    }

    const data = await res.json() as { id: string; post_id?: string };
    return data.post_id ?? data.id;
  }

  // Text-only post
  const res = await fetch(`${META_GRAPH_URL}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      access_token: accessToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Facebook post publish failed: ${res.status} ${err}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}
