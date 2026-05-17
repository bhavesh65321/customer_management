"""
services/billing_service.py — Subscription billing logic (MON-01 / MON-02)

Handles:
  - Plan seeding (idempotent — safe to call on every startup)
  - Store onboarding (assign trial, link plan)
  - Razorpay webhook event processing
  - Subscription status transitions
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from models.plan import Plan, StoreSubscription
from models.store import Store

logger = logging.getLogger(__name__)

# ── Plan definitions (single source of truth) ─────────────────────────────
PLANS = [
    {
        "name": "trial",
        "display_name": "Free Trial",
        "description": "14-day full-featured trial. No credit card required.",
        "price_monthly": 0.0,
        "max_customers": 100,
        "max_users": 3,
        "max_stores": 1,
        "has_girvi": True,
        "has_gst_invoicing": True,
        "has_analytics": True,
        "has_metal_exchange": True,
        "has_inventory": True,
        "has_whatsapp": False,
        "has_bulk_import": False,
        "has_reports_export": False,
        "has_api_access": False,
    },
    {
        "name": "starter",
        "display_name": "Starter",
        "description": "Essential billing and customer management for small shops.",
        "price_monthly": 499.0,
        "price_yearly": 4990.0,
        "max_customers": 200,
        "max_users": 2,
        "max_stores": 1,
        "has_girvi": False,
        "has_gst_invoicing": True,
        "has_analytics": False,
        "has_metal_exchange": False,
        "has_inventory": False,
        "has_whatsapp": False,
        "has_bulk_import": False,
        "has_reports_export": False,
        "has_api_access": False,
    },
    {
        "name": "pro",
        "display_name": "Pro",
        "description": "Everything in Starter + Girvi, Metal Exchange, Analytics, Inventory.",
        "price_monthly": 999.0,
        "price_yearly": 9990.0,
        "max_customers": 2000,
        "max_users": 10,
        "max_stores": 1,
        "has_girvi": True,
        "has_gst_invoicing": True,
        "has_analytics": True,
        "has_metal_exchange": True,
        "has_inventory": True,
        "has_whatsapp": True,
        "has_bulk_import": True,
        "has_reports_export": True,
        "has_api_access": False,
    },
    {
        "name": "enterprise",
        "display_name": "Enterprise",
        "description": "Unlimited customers, all features, API access, priority support.",
        "price_monthly": 2499.0,
        "price_yearly": 24990.0,
        "max_customers": None,   # unlimited
        "max_users": None,       # unlimited
        "max_stores": 5,
        "has_girvi": True,
        "has_gst_invoicing": True,
        "has_analytics": True,
        "has_metal_exchange": True,
        "has_inventory": True,
        "has_whatsapp": True,
        "has_bulk_import": True,
        "has_reports_export": True,
        "has_api_access": True,
    },
]

TRIAL_DAYS = 14


def seed_plans(db: Session) -> None:
    """
    Idempotent — insert default plans if they don't exist yet.
    Safe to call on every app startup.
    """
    for plan_data in PLANS:
        existing = db.query(Plan).filter(Plan.name == plan_data["name"]).first()
        if existing:
            # Update pricing / limits if changed (keeps DB in sync with code)
            for key, val in plan_data.items():
                if hasattr(existing, key) and getattr(existing, key) != val:
                    setattr(existing, key, val)
        else:
            db.add(Plan(**plan_data))
    db.commit()
    logger.info("[billing] Plans seeded/updated: %s", [p["name"] for p in PLANS])


def assign_trial(db: Session, store: Store) -> Store:
    """
    Called when a new store is onboarded. Gives them a 14-day trial
    on the 'trial' plan with full Pro-level features.
    """
    trial_plan = db.query(Plan).filter(Plan.name == "trial").first()
    store.plan_id = trial_plan.id if trial_plan else None
    store.subscription_status = "trial"
    store.trial_ends_at = datetime.utcnow() + timedelta(days=TRIAL_DAYS)
    db.add(StoreSubscription(
        store_id=store.id,
        plan_id=trial_plan.id if trial_plan else 1,
        gateway="manual",
        status="active",
        current_period_start=datetime.utcnow(),
        current_period_end=store.trial_ends_at,
    ))
    db.commit()
    db.refresh(store)
    logger.info("[billing] Trial assigned to store %d — expires %s", store.id, store.trial_ends_at)
    return store


def activate_subscription(
    db: Session,
    store: Store,
    plan_name: str,
    gateway: str = "razorpay",
    gateway_subscription_id: Optional[str] = None,
    gateway_customer_id: Optional[str] = None,
    gateway_payment_id: Optional[str] = None,
    amount_paid: Optional[float] = None,
    period_start: Optional[datetime] = None,
    period_end: Optional[datetime] = None,
) -> Store:
    """Transition a store to an active paid subscription."""
    plan = db.query(Plan).filter(Plan.name == plan_name).first()
    if not plan:
        raise ValueError(f"Plan '{plan_name}' not found")

    store.plan_id = plan.id
    store.subscription_status = "active"
    store.subscribed_at = datetime.utcnow()

    db.add(StoreSubscription(
        store_id=store.id,
        plan_id=plan.id,
        gateway=gateway,
        gateway_subscription_id=gateway_subscription_id,
        gateway_customer_id=gateway_customer_id,
        gateway_payment_id=gateway_payment_id,
        status="active",
        amount_paid=amount_paid,
        current_period_start=period_start or datetime.utcnow(),
        current_period_end=period_end,
    ))
    db.commit()
    db.refresh(store)
    logger.info("[billing] Store %d activated on plan '%s'", store.id, plan_name)
    return store


def suspend_subscription(db: Session, store: Store, reason: str = "past_due") -> Store:
    """Mark a store subscription as past_due or cancelled."""
    store.subscription_status = reason  # "past_due" | "cancelled"
    # Update latest subscription row
    latest = (
        db.query(StoreSubscription)
        .filter(StoreSubscription.store_id == store.id, StoreSubscription.status == "active")
        .order_by(StoreSubscription.created_at.desc())
        .first()
    )
    if latest:
        latest.status = reason
        latest.cancelled_at = datetime.utcnow()
    db.commit()
    db.refresh(store)
    logger.warning("[billing] Store %d subscription %s", store.id, reason)
    return store


# ── Razorpay webhook signature verification ────────────────────────────────

def verify_razorpay_signature(
    body: bytes,
    signature: str,
    webhook_secret: str,
) -> bool:
    """
    Verify that the webhook came from Razorpay.
    Returns True if valid, False otherwise.
    Always verify before processing — prevents spoofed payment events.
    """
    expected = hmac.new(
        webhook_secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature or "")


# ── Razorpay event → subscription state machine ───────────────────────────

def process_razorpay_event(db: Session, event: str, payload: dict) -> str:
    """
    Map a Razorpay webhook event to a subscription state change.

    Supported events:
      subscription.activated   → activate store
      subscription.charged     → refresh period_end
      subscription.halted      → mark past_due
      subscription.cancelled   → mark cancelled
      payment.captured         → log payment

    Returns a short description of what was done.
    """
    sub_payload = payload.get("payload", {}).get("subscription", {}).get("entity", {})
    razorpay_sub_id = sub_payload.get("id")

    if not razorpay_sub_id:
        return "no_subscription_id"

    # Find the store via gateway_subscription_id
    sub_row = (
        db.query(StoreSubscription)
        .filter(StoreSubscription.gateway_subscription_id == razorpay_sub_id)
        .order_by(StoreSubscription.created_at.desc())
        .first()
    )
    if not sub_row:
        logger.warning("[billing] Razorpay event '%s' — subscription %s not found in DB", event, razorpay_sub_id)
        return "subscription_not_found"

    store = db.query(Store).filter(Store.id == sub_row.store_id).first()
    if not store:
        return "store_not_found"

    plan_name = sub_payload.get("plan_id", "pro")  # map Razorpay plan ID → our name

    if event == "subscription.activated":
        period_end_ts = sub_payload.get("current_end")
        period_end = datetime.utcfromtimestamp(period_end_ts) if period_end_ts else None
        activate_subscription(
            db, store,
            plan_name=plan_name,
            gateway="razorpay",
            gateway_subscription_id=razorpay_sub_id,
            period_end=period_end,
        )
        return "activated"

    elif event in ("subscription.halted", "subscription.deactivated"):
        suspend_subscription(db, store, reason="past_due")
        return "halted"

    elif event == "subscription.cancelled":
        suspend_subscription(db, store, reason="cancelled")
        return "cancelled"

    elif event == "subscription.charged":
        period_end_ts = sub_payload.get("current_end")
        period_end = datetime.utcfromtimestamp(period_end_ts) if period_end_ts else None
        sub_row.current_period_end = period_end
        sub_row.updated_at = datetime.utcnow()
        db.commit()
        return "renewed"

    return f"unhandled_event:{event}"
