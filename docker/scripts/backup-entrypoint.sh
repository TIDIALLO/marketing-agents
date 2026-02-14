#!/bin/bash
# =============================================================================
# Backup Entrypoint
# Runs the backup script once every 24 hours via a sleep loop.
# =============================================================================

set -euo pipefail

BACKUP_INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup scheduler started (interval: ${BACKUP_INTERVAL}s)"

# Run an initial backup on startup
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running initial backup..."
/scripts/backup.sh

# Loop: sleep then backup
while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Next backup in ${BACKUP_INTERVAL} seconds"
  sleep "${BACKUP_INTERVAL}"
  /scripts/backup.sh
done
