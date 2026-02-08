const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

export async function sendSlackNotification(payload: {
  text: string;
  blocks?: Record<string, unknown>[];
}): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    console.log('[DEV] Slack not configured — message:', payload.text);
    return true;
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (err) {
    console.error('[Slack] Webhook failed:', err);
    return false;
  }
}
