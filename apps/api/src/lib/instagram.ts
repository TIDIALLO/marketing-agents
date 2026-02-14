const META_GRAPH_URL = 'https://graph.facebook.com/v22.0';

/**
 * Publish a photo post to Instagram via the Meta Graph API.
 * Two-step process: create media container, then publish it.
 * Image must be a publicly accessible URL.
 */
export async function publishInstagramPost(
  accessToken: string,
  igUserId: string,
  caption: string,
  imageUrl: string,
): Promise<string> {
  // Step 1: Create media container
  const containerRes = await fetch(`${META_GRAPH_URL}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: accessToken,
    }),
  });

  if (!containerRes.ok) {
    const err = await containerRes.text();
    throw new Error(`Instagram media container creation failed: ${containerRes.status} ${err}`);
  }

  const containerData = await containerRes.json() as { id: string };
  const containerId = containerData.id;

  // Step 2: Publish the container
  const publishRes = await fetch(`${META_GRAPH_URL}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: accessToken,
    }),
  });

  if (!publishRes.ok) {
    const err = await publishRes.text();
    throw new Error(`Instagram publish failed: ${publishRes.status} ${err}`);
  }

  const publishData = await publishRes.json() as { id: string };
  return publishData.id;
}
