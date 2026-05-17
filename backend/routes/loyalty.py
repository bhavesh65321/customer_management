"""
routes/loyalty.py — FEAT-05: Customer Loyalty Points API

Endpoints:
  GET  /api/loyalty/config                → get store's loyalty config
  POST /api/loyalty/config                → create/update store loyalty config (manager+)
  GET  /api/loyalty/customer/{id}/balance → get customer's current point balance
  GET  /api/loyalty/customer/{id}/history → get customer's full point ledger
  POST /api/loyalty/customer/{id}/earn    → manually award points (staff+)
  POST /api/loyalty/customer/{id}/redeem  → redeem points against a bill (staff+)
  POST /api/loyalty/customer/{id}/adjust  → admin correction entry (manager+)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from config.database import get_db
from dependencies import require_manager, require_staff
from models.loyalty import LoyaltyConfig, LoyaltyLedger
from models.customer import Customer
from utils.activity import log_activity

router = APIRouter(tags=["Loyalty"])


# ── Schemas ────────────────────────────────────────────────────────────────

class LoyaltyConfigIn(BaseModel):
    points_per_1000: float = Field(10, gt=0, description="Points earned per ₹1000 spent")
    rupee_value_per_point: float = Field(0.50, gt=0, description="₹ value of 1 point on redemption")
    min_redeem_points: int = Field(100, ge=0)
    max_redeem_pct: float = Field(20.0, ge=0, le=100)
    is_active: bool = True


class EarnPointsIn(BaseModel):
    points: int = Field(..., gt=0)
    note: Optional[str] = None
    transaction_id: Optional[int] = None


class RedeemPointsIn(BaseModel):
    points: int = Field(..., gt=0)
    transaction_id: Optional[int] = None
    note: Optional[str] = None


class AdjustPointsIn(BaseModel):
    points: int = Field(..., description="Positive to add, negative to subtract")
    note: str = Field(..., min_length=3)


# ── Helpers ────────────────────────────────────────────────────────────────

def _get_balance(db: Session, customer_id: int, store_id: int) -> int:
    result = db.query(func.coalesce(func.sum(LoyaltyLedger.points), 0)).filter(
        LoyaltyLedger.customer_id == customer_id,
        LoyaltyLedger.store_id == store_id,
    ).scalar()
    return int(result)


def _get_config(db: Session, store_id: int) -> Optional[LoyaltyConfig]:
    return db.query(LoyaltyConfig).filter(LoyaltyConfig.store_id == store_id).first()


# ── Routes ─────────────────────────────────────────────────────────────────

@router.get("/config")
def get_loyalty_config(db: Session = Depends(get_db), payload: dict = Depends(require_staff)):
    store_id = payload.get("store_id")
    config = _get_config(db, store_id)
    if not config:
        return {"configured": False, "message": "Loyalty programme not configured for this store"}
    return {
        "configured": True,
        "is_active": bool(config.is_active),
        "points_per_1000": float(config.points_per_1000),
        "rupee_value_per_point": float(config.rupee_value_per_point),
        "min_redeem_points": config.min_redeem_points,
        "max_redeem_pct": float(config.max_redeem_pct),
    }


@router.post("/config")
def upsert_loyalty_config(
    data: LoyaltyConfigIn,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_manager),
):
    store_id = payload.get("store_id")
    config = _get_config(db, store_id)
    if config:
        config.points_per_1000 = data.points_per_1000
        config.rupee_value_per_point = data.rupee_value_per_point
        config.min_redeem_points = data.min_redeem_points
        config.max_redeem_pct = data.max_redeem_pct
        config.is_active = 1 if data.is_active else 0
    else:
        config = LoyaltyConfig(
            store_id=store_id,
            points_per_1000=data.points_per_1000,
            rupee_value_per_point=data.rupee_value_per_point,
            min_redeem_points=data.min_redeem_points,
            max_redeem_pct=data.max_redeem_pct,
            is_active=1 if data.is_active else 0,
        )
        db.add(config)
    db.commit()
    return {"message": "Loyalty config saved", "store_id": store_id}


@router.get("/customer/{customer_id}/balance")
def get_customer_balance(
    customer_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")

    balance = _get_balance(db, customer_id, store_id)
    config = _get_config(db, store_id)
    rupee_value = round(balance * float(config.rupee_value_per_point), 2) if config else 0.0

    return {
        "customer_id": customer_id,
        "customer_name": customer.name,
        "points_balance": balance,
        "rupee_equivalent": rupee_value,
        "can_redeem": config is not None and bool(config.is_active) and balance >= config.min_redeem_points,
    }


@router.get("/customer/{customer_id}/history")
def get_customer_history(
    customer_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    ledger = (
        db.query(LoyaltyLedger)
        .filter(LoyaltyLedger.customer_id == customer_id, LoyaltyLedger.store_id == store_id)
        .order_by(LoyaltyLedger.created_at.desc())
        .limit(100)
        .all()
    )
    balance = _get_balance(db, customer_id, store_id)
    return {
        "customer_id": customer_id,
        "balance": balance,
        "history": [
            {
                "id": e.id,
                "points": e.points,
                "event_type": e.event_type,
                "note": e.note,
                "transaction_id": e.transaction_id,
                "date": e.created_at.isoformat() if e.created_at else None,
            }
            for e in ledger
        ],
    }


@router.post("/customer/{customer_id}/earn")
def earn_points(
    customer_id: int,
    data: EarnPointsIn,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    entry = LoyaltyLedger(
        store_id=store_id,
        customer_id=customer_id,
        points=data.points,
        event_type="earn",
        transaction_id=data.transaction_id,
        note=data.note or f"Manual award by staff",
        created_by=payload.get("user_id"),
    )
    db.add(entry)
    db.commit()
    new_balance = _get_balance(db, customer_id, store_id)
    log_activity(db, payload, "earned", "loyalty", customer_id,
                 f"Awarded {data.points} points to customer #{customer_id}", store_id)
    return {"message": f"Awarded {data.points} points", "new_balance": new_balance}


@router.post("/customer/{customer_id}/redeem")
def redeem_points(
    customer_id: int,
    data: RedeemPointsIn,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    balance = _get_balance(db, customer_id, store_id)
    if data.points > balance:
        raise HTTPException(400, f"Insufficient points. Balance: {balance}, Requested: {data.points}")

    config = _get_config(db, store_id)
    if not config or not config.is_active:
        raise HTTPException(400, "Loyalty programme is not active for this store")
    if balance < config.min_redeem_points:
        raise HTTPException(400, f"Minimum {config.min_redeem_points} points needed to redeem")

    rupee_discount = round(data.points * float(config.rupee_value_per_point), 2)

    entry = LoyaltyLedger(
        store_id=store_id,
        customer_id=customer_id,
        points=-data.points,  # negative = deduction
        event_type="redeem",
        transaction_id=data.transaction_id,
        note=data.note or f"Redeemed for ₹{rupee_discount} discount",
        created_by=payload.get("user_id"),
    )
    db.add(entry)
    db.commit()
    new_balance = _get_balance(db, customer_id, store_id)
    log_activity(db, payload, "redeemed", "loyalty", customer_id,
                 f"Redeemed {data.points} pts (₹{rupee_discount}) for customer #{customer_id}", store_id)
    return {
        "message": f"Redeemed {data.points} points",
        "rupee_discount": rupee_discount,
        "new_balance": new_balance,
    }


@router.post("/customer/{customer_id}/adjust")
def adjust_points(
    customer_id: int,
    data: AdjustPointsIn,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_manager),
):
    store_id = payload.get("store_id")
    entry = LoyaltyLedger(
        store_id=store_id,
        customer_id=customer_id,
        points=data.points,
        event_type="adjust",
        note=data.note,
        created_by=payload.get("user_id"),
    )
    db.add(entry)
    db.commit()
    new_balance = _get_balance(db, customer_id, store_id)
    return {"message": "Points adjusted", "adjustment": data.points, "new_balance": new_balance}
