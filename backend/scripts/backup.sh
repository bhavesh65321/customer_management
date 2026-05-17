#!/bin/bash
# =============================================================================
# backup.sh — MySQL database backup script (INF-01)
#
# Usage:
#   bash backup.sh                     # uses env vars or .env defaults
#   DB_PASSWORD=secret bash backup.sh  # override password inline
#
# Schedule (add to crontab):
#   0 2 * * * cd /path/to/backend && bash scripts/backup.sh >> logs/backup.log 2>&1
#
# Retention: keeps the last 30 days of backups automatically.
# =============================================================================

set -euo pipefail

# ── Load .env if present ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
fi

# ── Configuration (override via env vars) ────────────────────────────────────
DB_URL="${DATABASE_URL:-mysql+pymysql://root:root%40123@localhost:3306/customer_management_app}"

# Parse connection details from DATABASE_URL
# Format: mysql+pymysql://user:pass@host:port/dbname
DB_USER=$(echo "$DB_URL" | sed -E 's|.*://([^:]+):.*|\1|')
DB_PASS=$(echo "$DB_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|' | python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))")
DB_HOST=$(echo "$DB_URL" | sed -E 's|.*@([^:/]+)[:/].*|\1|')
DB_PORT=$(echo "$DB_URL" | sed -E 's|.*@[^:]+:([0-9]+)/.*|\1|')
DB_NAME=$(echo "$DB_URL" | sed -E 's|.*/([^?]+).*|\1|')

BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/../backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# ── Ensure backup directory exists ───────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

echo "=================================================="
echo "  DB Backup — $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Database : $DB_NAME @ $DB_HOST:$DB_PORT"
echo "  Output   : $BACKUP_FILE"
echo "=================================================="

# ── Run mysqldump ─────────────────────────────────────────────────────────────
mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --password="$DB_PASS" \
  --single-transaction \
  --routines \
  --triggers \
  --set-gtid-purged=OFF \
  "$DB_NAME" | gzip -9 > "$BACKUP_FILE"

# ── Verify backup is non-empty ────────────────────────────────────────────────
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "❌ ERROR: Backup file is empty. Something went wrong."
  rm -f "$BACKUP_FILE"
  exit 1
fi

echo "✅ Backup complete: $BACKUP_FILE ($BACKUP_SIZE)"

# ── Prune old backups ─────────────────────────────────────────────────────────
echo "🗑  Removing backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
REMAINING=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" | wc -l | tr -d ' ')
echo "📦 Backups retained: $REMAINING"
echo "=================================================="
