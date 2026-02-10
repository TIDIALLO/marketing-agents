// Scheduler stub — all cron jobs migrated to n8n workflows
// MKT-107: Publish scheduled content (every 5 min)
// MKT-108: Collect metrics + detect winners (every 6h)
// MKT-401: Refresh OAuth tokens (every 12h)
// MKT-303: Execute nurturing follow-ups (every 1h)

export function startScheduler(): void {
  console.log('[Scheduler] Stub — all tasks migrated to n8n cron workflows');
}

export function stopScheduler(): void {
  // No-op
}
