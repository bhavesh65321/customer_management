# Backups Directory

This directory stores MySQL database backup files created by `scripts/backup.sh`.

## Files

| Pattern | Description |
|---------|-------------|
| `customer_management_app_YYYYMMDD_HHMMSS.sql.gz` | Compressed daily backup |

## Usage

**Manual backup (one-shot):**
```bash
cd backend
bash scripts/backup.sh
```

**Restore from a backup:**
```bash
cd backend
bash scripts/restore.sh backups/customer_management_app_20260509_020000.sql.gz
```

**Run scheduler now (test):**
```bash
cd backend
python3 scripts/backup_scheduler.py --now
```

## Notes

- Backups older than `BACKUP_RETENTION_DAYS` (default: 30) are auto-deleted
- This directory is git-ignored — backup files are never committed
- For production: mount this directory to a persistent volume (cloud storage recommended)
