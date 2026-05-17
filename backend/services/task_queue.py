"""
services/task_queue.py — In-process background task service (BE-03)

Provides a lightweight task queue using FastAPI's built-in BackgroundTasks
+ APScheduler for recurring scheduled jobs. No Redis or Celery required —
runs in-process with the FastAPI server.

Architecture:
  • One-off tasks:  Use FastAPI BackgroundTasks (already available on every route)
  • Recurring jobs: APScheduler runs in the same process, registered at startup

Supported task types:
  - send_whatsapp_reminder   — Build wa.me URL and log (actual send via future integration)
  - send_girvi_due_alerts    — Scheduled daily: flag loans with interest due
  - cleanup_expired_tokens   — Scheduled daily: purge expired password-reset tokens
  - notify_overdue_orders    — Scheduled hourly: update order status to "overdue"

Usage in a route:
    from fastapi import BackgroundTasks
    from services.task_queue import enqueue

    @router.post("/create")
    def create(data: ..., bg: BackgroundTasks, ...):
        # ... business logic ...
        enqueue(bg, "send_whatsapp_reminder", phone="9876543210", message="Your order is ready!")
        return result

Usage for scheduled jobs — registered automatically on app startup via
`register_scheduled_jobs(scheduler)`.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ── Task registry ──────────────────────────────────────────────────────────
# Maps task name → handler function. All handlers accept **kwargs.
_REGISTRY: dict[str, Any] = {}


def _register(name: str):
    """Decorator to register a task handler."""
    def decorator(fn):
        _REGISTRY[name] = fn
        return fn
    return decorator


def enqueue(background_tasks: BackgroundTasks, task_name: str, **kwargs):
    """
    Enqueue a named task to run in the background after the HTTP response
    is sent. Uses FastAPI's BackgroundTasks mechanism (runs in-process,
    no extra infrastructure needed).

    Example:
        enqueue(bg, "send_whatsapp_reminder", phone="91...", message="...")
    """
    handler = _REGISTRY.get(task_name)
    if not handler:
        logger.warning("[task_queue] Unknown task: %s", task_name)
        return
    background_tasks.add_task(_run_safely, task_name, handler, **kwargs)


def _run_safely(task_name: str, handler, **kwargs):
    """Wrapper that catches and logs exceptions so a failing task never
    crashes the worker thread."""
    try:
        logger.info("[task_queue] START %s kwargs=%s", task_name, list(kwargs.keys()))
        handler(**kwargs)
        logger.info("[task_queue] DONE  %s", task_name)
    except Exception as exc:
        logger.error("[task_queue] FAILED %s: %s", task_name, exc, exc_info=True)


# ── Task handlers ──────────────────────────────────────────────────────────

@_register("send_whatsapp_reminder")
def send_whatsapp_reminder(phone: str, message: str, customer_name: str = ""):
    """
    Logs the WhatsApp reminder that would be sent.
    Replace the body with an actual WhatsApp Business API call
    (e.g. Twilio, Gupshup, Meta Cloud API) when credentials are available.
    """
    digits = "".join(c for c in str(phone) if c.isdigit())
    if len(digits) == 10:
        digits = f"91{digits}"
    wa_url = f"https://wa.me/{digits}?text={message}"
    logger.info(
        "[whatsapp] Would send to %s (%s): %s | URL: %s",
        customer_name, digits, message[:60], wa_url,
    )
    # TODO: POST to WhatsApp Business API when WHATSAPP_TOKEN is set in .env


@_register("notify_order_ready")
def notify_order_ready(order_id: int, customer_name: str, customer_phone: str = ""):
    """Notify customer their jewellery order is ready for pickup."""
    message = (
        f"Namaste {customer_name}! Your order #{order_id} is ready for pickup. "
        "Please visit the store at your convenience. 🙏"
    )
    if customer_phone:
        send_whatsapp_reminder(phone=customer_phone, message=message, customer_name=customer_name)


@_register("notify_girvi_interest_due")
def notify_girvi_interest_due(loan_id: int, customer_name: str, customer_phone: str,
                               months: int, amount: float):
    """Remind customer that girvi loan interest is due."""
    message = (
        f"Namaste {customer_name}! Your girvi loan #{loan_id} has {months} month(s) "
        f"of interest due (₹{amount:,.2f}). Please visit the store. 🙏"
    )
    if customer_phone:
        send_whatsapp_reminder(phone=customer_phone, message=message, customer_name=customer_name)


# ── Scheduled jobs (run via APScheduler) ───────────────────────────────────

def job_cleanup_expired_tokens(db_factory):
    """
    Daily job: delete expired password-reset tokens.
    `db_factory` is a callable that returns a Session (pass `SessionLocal`).
    """
    db: Session = db_factory()
    try:
        from models.password_reset_token import PasswordResetToken
        cutoff = datetime.utcnow() - timedelta(hours=24)
        deleted = (
            db.query(PasswordResetToken)
            .filter(PasswordResetToken.created_at < cutoff)
            .delete()
        )
        db.commit()
        if deleted:
            logger.info("[scheduler] Cleaned up %d expired password reset tokens", deleted)
    except Exception as exc:
        logger.error("[scheduler] Token cleanup failed: %s", exc)
        db.rollback()
    finally:
        db.close()


def job_flag_overdue_orders(db_factory):
    """
    Hourly job: mark orders as 'overdue' when expected_date has passed
    and status is still 'pending' or 'in_progress'.
    """
    db: Session = db_factory()
    try:
        from models.order_repair import Order
        from sqlalchemy import and_
        now = datetime.utcnow().date()
        updated = (
            db.query(Order)
            .filter(
                and_(
                    Order.expected_date < now,
                    Order.status.in_(["pending", "in_progress"]),
                )
            )
            .update({"status": "overdue"}, synchronize_session=False)
        )
        db.commit()
        if updated:
            logger.info("[scheduler] Marked %d orders as overdue", updated)
    except Exception as exc:
        logger.error("[scheduler] Overdue orders job failed: %s", exc)
        db.rollback()
    finally:
        db.close()


def register_scheduled_jobs(scheduler, db_factory):
    """
    Register all recurring background jobs with the APScheduler instance.
    Call this once from `main.py` `on_startup`.

    Args:
        scheduler: An `apscheduler.schedulers.background.BackgroundScheduler` instance
        db_factory: `SessionLocal` from `config.database`
    """
    # Daily at 02:30 IST (UTC+5:30 → 21:00 UTC previous day)
    scheduler.add_job(
        job_cleanup_expired_tokens,
        trigger="cron",
        hour=21,
        minute=0,
        id="cleanup_tokens",
        replace_existing=True,
        args=[db_factory],
    )

    # Hourly: flag overdue orders
    scheduler.add_job(
        job_flag_overdue_orders,
        trigger="interval",
        hours=1,
        id="flag_overdue_orders",
        replace_existing=True,
        args=[db_factory],
    )

    # FEAT-02: Every 60 minutes — fetch live gold/silver rates
    from services.metal_rate_fetcher import job_refresh_metal_rates
    scheduler.add_job(
        job_refresh_metal_rates,
        trigger="interval",
        minutes=60,
        id="refresh_metal_rates",
        replace_existing=True,
        args=[db_factory],
    )

    logger.info("[scheduler] Registered %d scheduled jobs", 3)
