import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('sendSlackNotification', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should log message in dev mode (no webhook URL)', async () => {
    vi.stubEnv('SLACK_WEBHOOK_URL', '');
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { sendSlackNotification } = await import('../slack');
    const result = await sendSlackNotification({ text: 'Test message' });

    expect(result).toBe(true);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Slack not configured'),
      'Test message',
    );
    spy.mockRestore();
  });

  it('should call fetch when webhook URL is configured', async () => {
    vi.stubEnv('SLACK_WEBHOOK_URL', 'https://hooks.slack.com/test');
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const { sendSlackNotification } = await import('../slack');
    const result = await sendSlackNotification({ text: 'Production alert' });

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://hooks.slack.com/test',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('should return false on fetch failure', async () => {
    vi.stubEnv('SLACK_WEBHOOK_URL', 'https://hooks.slack.com/test');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { sendSlackNotification } = await import('../slack');
    const result = await sendSlackNotification({ text: 'Failing alert' });

    expect(result).toBe(false);
  });
});
