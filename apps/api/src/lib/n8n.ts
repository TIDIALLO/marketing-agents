const N8N_BASE_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678';

export async function triggerWorkflow(
  webhookPath: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const url = `${N8N_BASE_URL}/webhook/${webhookPath}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[n8n] Webhook ${webhookPath} failed: ${response.status}`);
      return null;
    }

    return response.json();
  } catch (err) {
    // n8n may not be running in dev — log and continue
    console.log(`[DEV] n8n webhook ${webhookPath} not reachable — skipping`);
    return null;
  }
}
