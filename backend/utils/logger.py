"""
Central logging configuration for the application.

Three log streams:
  logs/requests.log  — every HTTP request/response (set up in middleware)
  logs/audit.log     — every business operation (create/update/delete)
  logs/app.log       — server errors, warnings, startup events

All logs are JSON lines.  Each log file rotates at 10 MB, keeping 5 backups.

Usage:
    from utils.logger import get_app_logger, get_audit_logger

    app_log   = get_app_logger()
    audit_log = get_audit_logger()

    app_log.error("Something broke", exc_info=True)
    audit_log.info(json.dumps({...}))
"""

import json
import logging
import logging.handlers
import time
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Log directory — always relative to the backend root
# ---------------------------------------------------------------------------

_LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
_LOG_DIR.mkdir(parents=True, exist_ok=True)

_JSON_FMT = logging.Formatter("%(message)s")


def _make_rotating_logger(name: str, filename: str) -> logging.Logger:
    """Create (or return existing) logger that writes JSON lines to a rotating file."""
    logger = logging.getLogger(name)
    if logger.handlers:          # already configured — don't add twice
        return logger
    logger.setLevel(logging.DEBUG)
    logger.propagate = False

    # Console — INFO+
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(_JSON_FMT)
    logger.addHandler(ch)

    # Rotating file — DEBUG+
    fh = logging.handlers.RotatingFileHandler(
        _LOG_DIR / filename,
        maxBytes=10 * 1024 * 1024,   # 10 MB
        backupCount=5,
        encoding="utf-8",
    )
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(_JSON_FMT)
    logger.addHandler(fh)

    return logger


# ---------------------------------------------------------------------------
# Public getters (idempotent)
# ---------------------------------------------------------------------------

def get_app_logger() -> logging.Logger:
    """
    General application logger.
    Use for: startup events, unhandled errors, background task results.
    Writes to logs/app.log
    """
    return _make_rotating_logger("app_log", "app.log")


def get_audit_logger() -> logging.Logger:
    """
    Audit / business-operation logger.
    Use for: create/update/delete of any business entity.
    Writes to logs/audit.log
    """
    return _make_rotating_logger("audit_log_file", "audit.log")


# ---------------------------------------------------------------------------
# Convenience: write a structured audit JSON line
# ---------------------------------------------------------------------------

def log_audit_json(
    action: str,
    entity_type: str,
    entity_id: Optional[str],
    message: str,
    user_id: Optional[int] = None,
    actor_name: Optional[str] = None,
    role: Optional[str] = None,
    store_id: Optional[int] = None,
    old_value=None,
    new_value=None,
) -> None:
    """
    Write one JSON line to logs/audit.log.
    Called automatically by log_activity() — you rarely need this directly.
    """
    entry = {
        "ts":          time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "action":      action,
        "entity_type": entity_type,
        "entity_id":   str(entity_id) if entity_id is not None else None,
        "message":     message,
        "user_id":     user_id,
        "actor_name":  actor_name,
        "role":        role,
        "store_id":    store_id,
        "old_value":   old_value,
        "new_value":   new_value,
    }
    get_audit_logger().info(json.dumps(entry, default=str))


def log_app_event(level: str, event: str, **kwargs) -> None:
    """
    Write one JSON line to logs/app.log.

    level: "info" | "warning" | "error"
    event: short event name e.g. "startup", "migration_failed"
    kwargs: any extra fields
    """
    entry = {
        "ts":    time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "level": level.upper(),
        "event": event,
        **kwargs,
    }
    logger = get_app_logger()
    line = json.dumps(entry, default=str)
    getattr(logger, level.lower(), logger.info)(line)
