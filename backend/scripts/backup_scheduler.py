"""
backup_scheduler.py — Python-based backup scheduler (INF-01)

Runs as a long-lived process alongside the backend (or as its own systemd
service / Docker container). Triggers backup.sh on a daily schedule.

Usage:
    python3 scripts/backup_scheduler.py

Environment variables (loaded from .env):
    BACKUP_SCHEDULE_HOUR   — Hour to run backup (0-23, default: 2 = 2am)
    BACKUP_SCHEDULE_MINUTE — Minute to run backup (0-59, default: 0)
    BACKUP_RETENTION_DAYS  — Days to keep backups (default: 30)

Requirements: pip install apscheduler  (added to requirements.txt)
"""
import os
import sys
import subprocess
import logging
from datetime import datetime
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
BACKUP_SCRIPT = SCRIPT_DIR / "backup.sh"

# Add backend to path so we can load .env via config.settings
sys.path.insert(0, str(BACKEND_DIR))

try:
    from dotenv import load_dotenv
    load_dotenv(BACKEND_DIR / ".env")
except ImportError:
    pass  # dotenv optional here; env vars may already be set

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [BACKUP] %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(BACKEND_DIR / "logs" / "backup.log"),
    ],
)
log = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
SCHEDULE_HOUR   = int(os.environ.get("BACKUP_SCHEDULE_HOUR",   "2"))
SCHEDULE_MINUTE = int(os.environ.get("BACKUP_SCHEDULE_MINUTE", "0"))
RETENTION_DAYS  = int(os.environ.get("BACKUP_RETENTION_DAYS",  "30"))


def run_backup() -> None:
    """Execute backup.sh and log the result."""
    log.info("Starting scheduled database backup...")
    try:
        result = subprocess.run(
            ["bash", str(BACKUP_SCRIPT)],
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout
            env={**os.environ, "BACKUP_RETENTION_DAYS": str(RETENTION_DAYS)},
        )
        if result.returncode == 0:
            log.info("Backup succeeded:\n%s", result.stdout.strip())
        else:
            log.error("Backup FAILED (exit %d):\nstdout: %s\nstderr: %s",
                      result.returncode, result.stdout, result.stderr)
    except subprocess.TimeoutExpired:
        log.error("Backup timed out after 5 minutes")
    except Exception as exc:
        log.error("Backup error: %s", exc, exc_info=True)


def main() -> None:
    try:
        from apscheduler.schedulers.blocking import BlockingScheduler
    except ImportError:
        log.error("apscheduler not installed. Run: pip install apscheduler==3.10.4")
        sys.exit(1)

    scheduler = BlockingScheduler(timezone="Asia/Kolkata")  # IST
    scheduler.add_job(
        run_backup,
        trigger="cron",
        hour=SCHEDULE_HOUR,
        minute=SCHEDULE_MINUTE,
        id="daily_db_backup",
        replace_existing=True,
    )

    next_run = scheduler.get_job("daily_db_backup").next_run_time
    log.info(
        "Backup scheduler started. Will run daily at %02d:%02d IST. Next run: %s",
        SCHEDULE_HOUR, SCHEDULE_MINUTE, next_run,
    )
    log.info("Backup retention: %d days | Script: %s", RETENTION_DAYS, BACKUP_SCRIPT)

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("Backup scheduler stopped.")


if __name__ == "__main__":
    # Allow running a one-shot backup immediately: python3 backup_scheduler.py --now
    if "--now" in sys.argv:
        log.info("Running immediate backup (--now flag)")
        run_backup()
    else:
        main()
