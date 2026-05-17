"""
routes/billing.py — Subscription & billing API (MON-01 / MON-02)

Endpoints:
  GET  /api/billing/plans              → list all active plans (public)
  GET  /api/billing/status             → current store's subscription status (staff+)
  POST /api/billing/webhook/razorpay   → Razorpay webhook receiver (no auth, HMAC-verified)
  POST /api/billing/admin/assign-plan  → admin: manually set a store's plan (admin only)
  POST /api/billing/admin/seed-plans   → admin: reseed plan table from code (admin only)
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config.database import get_db
from dependencies import require_admin, require_staff
from models.plan import Plan, StoreSubscription
from models.store import Store
from services.billing_service import (
    activate_subscription,
    assign_trial,
    process_razorpay_event,
    seed_plans,
    verify_razorpay_signature,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Billing"])

# ── Helper: get RAZORPAY_WEBHOOK_SECRET from settings (graceful if missing) ─
def _webhook_secret() -> str:
    try:
        import os
        return os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
    except Exception:
        return ""


# ── Schemas ────────────────────────────────────────────────────────────────

class AssignPlanRequest(BaseModel):
    store_id: int
    plan_name: str
    gateway_subscription_id: Optional[str] = None
    amount_paid: Optional[float] = None


# ── Public: list plans ─────────────────────────────────────────────────────

@router.get("/plans")
def list_plans(db: Session = Depends(get_db)):
    """Return all active subscription plans (used on the pricing/upgrade page)."""
    plans = db.query(Plan).filter(Plan.is_active == True, Plan.name != "trial").order_by(Plan.price_monthly).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "display_name": p.display_name,
            "description": p.description,
            "price_monthly": p.price_monthly,
            "price_yearly": p.price_yearly,
            "max_customers": p.max_customers,
            "max_users": p.max_users,
            "features": {
                "girvi": p.has_girvi,
                "gst_invoicing": p.has_gst_invoicing,
                "analytics": p.has_analytics,
                "metal_exchange": p.has_metal_exchange,
                "inventory": p.has_inventory,
                "whatsapp": p.has_whatsapp,
                "bulk_import": p.has_bulk_import,
                "reports_export": p.has_reports_export,
                "api_access": p.has_api_access,
            },
        }
        for p in plans
    ]


# ── Staff: current subscription status ────────────────────────────────────

@router.get("/status")
def subscription_status(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    """Return the current store's plan and subscription status."""
    store_id = payload.get("store_id")
    if not store_id:
        # Admins without a store_id see a summary
        return {"subscription_status": "admin", "plan": None}

    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    plan = store.plan
    return {
        "subscription_status": store.subscription_status,
        "is_trial_expired": store.is_trial_expired,
        "trial_ends_at": store.trial_ends_at.isoformat() if store.trial_ends_at else None,
        "subscribed_at": store.subscribed_at.isoformat() if store.subscribed_at else None,
        "plan": {
            "name": plan.name,
            "display_name": plan.display_name,
            "price_monthly": plan.price_monthly,
            "max_customers": plan.max_customers,
        } if plan else None,
    }


# ── Razorpay webhook ───────────────────────────────────────────────────────

@router.post("/webhook/razorpay", include_in_schema=False)
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Receives Razorpay webhook events.
    HMAC-SHA256 signature is verified before processing.
    Razorpay retries failed webhooks — always return 200 to acknowledge receipt.
    """
    body = await request.body()
    secret = _webhook_secret()

    if secret:
        if not x_razorpay_signature:
            logger.warning("[billing/webhook] Missing Razorpay-Signature header")
            raise HTTPException(status_code=400, detail="Missing signature header")
        if not verify_razorpay_signature(body, x_razorpay_signature, secret):
            logger.warning("[billing/webhook] Invalid Razorpay signature — possible spoofed event")
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        logger.warning("[billing/webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping signature check")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event = payload.get("event", "")
    logger.info("[billing/webhook] Received event: %s", event)

    result = process_razorpay_event(db, event, payload)
    logger.info("[billing/webhook] Event '%s' result: %s", event, result)

    # Always 200 — Razorpay will retry on non-2xx
    return {"received": True, "event": event, "result": result}


# ── Admin: manually assign plan ────────────────────────────────────────────

@router.post("/admin/assign-plan")
def admin_assign_plan(
    data: AssignPlanRequest,
    db: Session = Depends(get_db),
    _auth: dict = Depends(require_admin),
):
    """Admin: override a store's plan (e.g. for custom deals or support fixes)."""
    store = db.query(Store).filter(Store.id == data.store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    if data.plan_name == "trial":
        assign_trial(db, store)
    else:
        activate_subscription(
            db, store,
            plan_name=data.plan_name,
            gateway="manual",
            gateway_subscription_id=data.gateway_subscription_id,
            amount_paid=data.amount_paid,
        )

    return {"ok": True, "store_id": store.id, "plan": data.plan_name,
            "status": store.subscription_status}


@router.post("/admin/seed-plans")
def admin_seed_plans(
    db: Session = Depends(get_db),
    _auth: dict = Depends(require_admin),
):
    """Admin: re-seed plan definitions from code. Safe to call anytime."""
    seed_plans(db)
    plans = db.query(Plan).all()
    return {"seeded": len(plans), "plans": [p.name for p in plans]}
