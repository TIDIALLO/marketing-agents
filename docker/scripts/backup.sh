#!/bin/bash
# =============================================================================
# Database Backup Script for agents-marketing
# Creates compressed PostgreSQL backups and retains the last 7 daily backups.
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BACKUP_DIR="/backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_${TIMESTAMP}.sql.gz"

# Credentials from environment variables
DB_USER="${POSTGRES_USER:?POSTGRES_USER is not set}"
DB_PASS="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is not set}"
DB_NAME="${POSTGRES_DB:?POSTGRES_DB is not set}"
DB_HOST="${POSTGRES_HOST:-mkt-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"

# ---------------------------------------------------------------------------
# Functions
# ---------------------------------------------------------------------------
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
mkdir -p "${BACKUP_DIR}"

log "Starting backup of database '${DB_NAME}' from ${DB_HOST}:${DB_PORT}"

# ---------------------------------------------------------------------------
# Create backup
# ---------------------------------------------------------------------------
export PGPASSWORD="${DB_PASS}"

if pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"; then

  FILESIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
  log "Backup completed successfully: ${BACKUP_FILE} (${FILESIZE})"
else
  log "ERROR: Backup failed"
  rm -f "${BACKUP_DIR}/${BACKUP_FILE}"
  exit 1
fi

unset PGPASSWORD

# ---------------------------------------------------------------------------
# Cleanup old backups (keep last RETENTION_DAYS days)
# ---------------------------------------------------------------------------
DELETED=0
for OLD_BACKUP in $(find "${BACKUP_DIR}" -name "backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS}); do
  log "Removing old backup: $(basename "${OLD_BACKUP}")"
  rm -f "${OLD_BACKUP}"
  DELETED=$((DELETED + 1))
done

if [ "${DELETED}" -gt 0 ]; then
  log "Cleaned up ${DELETED} old backup(s)"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
TOTAL=$(find "${BACKUP_DIR}" -name "backup_*.sql.gz" -type f | wc -l)
log "Backup complete. ${TOTAL} backup(s) currently stored in ${BACKUP_DIR}"
