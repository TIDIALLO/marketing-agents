import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('publishInstagramPost', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should create media container then publish it', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'container-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'post-456' }),
      });
    vi.stubGlobal('fetch', mockFetch);

    const { publishInstagramPost } = await import('../instagram');
    const postId = await publishInstagramPost('token', 'ig-user-1', 'Hello world', 'https://example.com/img.png');

    expect(postId).toBe('post-456');
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // First call: create container
    expect(mockFetch).toHaveBeenNthCalledWith(1,
      'https://graph.facebook.com/v22.0/ig-user-1/media',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          image_url: 'https://example.com/img.png',
          caption: 'Hello world',
          access_token: 'token',
        }),
      }),
    );

    // Second call: publish container
    expect(mockFetch).toHaveBeenNthCalledWith(2,
      'https://graph.facebook.com/v22.0/ig-user-1/media_publish',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          creation_id: 'container-123',
          access_token: 'token',
        }),
      }),
    );
  });

  it('should throw on container creation failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Invalid image URL'),
    }));

    const { publishInstagramPost } = await import('../instagram');
    await expect(
      publishInstagramPost('token', 'ig-user-1', 'caption', 'bad-url'),
    ).rejects.toThrow('Instagram media container creation failed: 400');
  });

  it('should throw on publish failure', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'container-123' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error'),
      }),
    );

    const { publishInstagramPost } = await import('../instagram');
    await expect(
      publishInstagramPost('token', 'ig-user-1', 'caption', 'https://example.com/img.png'),
    ).rejects.toThrow('Instagram publish failed: 500');
  });
});
