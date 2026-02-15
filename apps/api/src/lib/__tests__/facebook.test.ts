import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('publishFacebookPost', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should publish a photo post when imageUrl is provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'photo-123', post_id: 'page_photo-123' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { publishFacebookPost } = await import('../facebook');
    const postId = await publishFacebookPost('token', 'page-1', 'Check this out', 'https://example.com/img.png');

    expect(postId).toBe('page_photo-123');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v22.0/page-1/photos',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com/img.png',
          message: 'Check this out',
          access_token: 'token',
        }),
      }),
    );
  });

  it('should fall back to photo id when post_id is absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'photo-789' }),
    }));

    const { publishFacebookPost } = await import('../facebook');
    const postId = await publishFacebookPost('token', 'page-1', 'msg', 'https://example.com/img.png');

    expect(postId).toBe('photo-789');
  });

  it('should publish a text-only post when no imageUrl', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'post-456' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { publishFacebookPost } = await import('../facebook');
    const postId = await publishFacebookPost('token', 'page-1', 'Hello from MarketingEngine');

    expect(postId).toBe('post-456');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v22.0/page-1/feed',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello from MarketingEngine',
          access_token: 'token',
        }),
      }),
    );
  });

  it('should throw on photo publish failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Insufficient permissions'),
    }));

    const { publishFacebookPost } = await import('../facebook');
    await expect(
      publishFacebookPost('token', 'page-1', 'msg', 'https://example.com/img.png'),
    ).rejects.toThrow('Facebook photo publish failed: 403');
  });

  it('should throw on text post publish failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limited'),
    }));

    const { publishFacebookPost } = await import('../facebook');
    await expect(
      publishFacebookPost('token', 'page-1', 'msg'),
    ).rejects.toThrow('Facebook post publish failed: 429');
  });
});
