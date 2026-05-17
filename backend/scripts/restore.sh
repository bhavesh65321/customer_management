#!/bin/bash
# =============================================================================
# restore.sh — MySQL database restore from a backup file (INF-01)
#
# Usage:
#   bash restore.sh backups/customer_management_app_20260509_020000.sql.gz
#
# WARNING: This will DROP and recreate the database. All current data will be
#          replaced by the backup. Make a fresh backup before restoring.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [[ -f "$ENV_FILE" ]]; then
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
fi

DB_URL="${DATABASE_URL:-mysql+pymysql://root:root%40123@localhost:3306/customer_management_app}"
DB_USER=$(echo "$DB_URL" | sed -E 's|.*://([^:]+):.*|\1|')
DB_PASS=$(echo "$DB_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|' | python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))")
DB_HOST=$(echo "$DB_URL" | sed -E 's|.*@([^:/]+)[:/].*|\1|')
DB_PORT=$(echo "$DB_URL" | sed -E 's|.*@[^:]+:([0-9]+)/.*|\1|')
DB_NAME=$(echo "$DB_URL" | sed -E 's|.*/([^?]+).*|\1|')

BACKUP_FILE="${1:-}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "❌ Usage: bash restore.sh <backup_file.sql.gz>"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "=================================================="
echo "  DB Restore — $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Source   : $BACKUP_FILE ($BACKUP_SIZE)"
echo "  Target   : $DB_NAME @ $DB_HOST:$DB_PORT"
echo "=================================================="
echo ""
read -r -p "⚠️  This will REPLACE all data in '$DB_NAME'. Are you sure? [yes/N] " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi

echo "🔄 Restoring..."
gunzip -c "$BACKUP_FILE" | mysql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --password="$DB_PASS" \
  "$DB_NAME"

echo "✅ Restore complete."
echo "=================================================="
