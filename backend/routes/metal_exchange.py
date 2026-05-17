from typing import Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from config.database import get_db


def _schema_keys(schema_class):
    return list(getattr(schema_class, "model_fields", None) or getattr(schema_class, "__fields__", {}) or [])
from dependencies import require_staff
from core.db_filters import apply_store_filter, resolve_write_store_id
from models.metal_exchange import MetalExchange
from models.customer import Customer
from schemas.metal_exchange_schema import (
    MetalExchangeCreate,
    MetalExchangeResponse,
    AdvanceBalanceResponse,
)
from utils.activity import log_activity

router = APIRouter(tags=["Metal Exchange"])

EXCHANGE_TYPES = ["raw_to_pure", "raw_to_cash", "advance_metal", "advance_money"]


@router.get("", response_model=list)
def list_exchanges(
    customer_id: Optional[int] = Query(None),
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(MetalExchange).join(Customer, MetalExchange.customer_id == Customer.id)
    q = apply_store_filter(q, MetalExchange, payload)
    if customer_id is not None:
        q = q.filter(MetalExchange.customer_id == customer_id)
    if type:
        q = q.filter(MetalExchange.type == type)
    q = q.order_by(MetalExchange.exchange_date.desc())
    rows = q.all()
    keys = _schema_keys(MetalExchangeResponse)
    return [
        MetalExchangeResponse(
            **{k: getattr(r, k) for k in keys if hasattr(r, k)},
            customer_name=r.customer.name,
        )
        for r in rows
    ]


@router.post("", response_model=MetalExchangeResponse, status_code=201)
def create_exchange(
    data: MetalExchangeCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = resolve_write_store_id(payload, db, getattr(data, 'store_id', None))
    if data.type not in EXCHANGE_TYPES:
        raise HTTPException(status_code=400, detail=f"type must be one of {EXCHANGE_TYPES}")
    customer = (
        db.query(Customer)
        .filter(Customer.id == data.customer_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    rec = MetalExchange(
        store_id=store_id,
        customer_id=data.customer_id,
        type=data.type,
        metal_type=data.metal_type,
        raw_weight=data.raw_weight,
        raw_purity=data.raw_purity,
        pure_weight=data.pure_weight,
        cash_amount=data.cash_amount,
        making_charges=data.making_charges,
        rate_per_gram=data.rate_per_gram,
        notes=data.notes,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    log_activity(
        db,
        payload,
        action="created",
        entity_type="metal_exchange",
        entity_id=str(rec.id),
        message=f"Metal exchange ({data.type}) for {customer.name}",
        store_id=store_id,
    )
    keys = _schema_keys(MetalExchangeResponse)
    out = {k: getattr(rec, k) for k in keys if hasattr(rec, k)}
    out["customer_name"] = customer.name
    return MetalExchangeResponse(**out)


def _advance_totals_for_customer(
    db: Session, customer_id: int, payload: dict
) -> Tuple[float, Optional[float], float]:
    metal_q = (
        db.query(
            func.coalesce(func.sum(MetalExchange.raw_weight), 0),
            func.max(MetalExchange.raw_purity),
        )
        .filter(
            MetalExchange.customer_id == customer_id,
            MetalExchange.type == "advance_metal",
        )
    )
    metal_q = apply_store_filter(metal_q, MetalExchange, payload)
    metal_row = metal_q.first()
    advance_metal = float(metal_row[0]) if metal_row else 0.0
    advance_purity = float(metal_row[1]) if metal_row and metal_row[1] is not None else None
    money_q = (
        db.query(func.coalesce(func.sum(MetalExchange.cash_amount), 0))
        .filter(
            MetalExchange.customer_id == customer_id,
            MetalExchange.type == "advance_money",
        )
    )
    money_q = apply_store_filter(money_q, MetalExchange, payload)
    advance_money = float(money_q.scalar() or 0)
    return advance_metal, advance_purity, advance_money


@router.get("/advance-balance", response_model=list)
def list_advance_balance(
    customer_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    if customer_id is not None:
        cq = db.query(Customer).filter(Customer.id == customer_id)
        if store_id is not None:
            cq = cq.filter(Customer.store_id == store_id)
        cust = cq.first()
        if not cust:
            raise HTTPException(status_code=404, detail="Customer not found")
        am, purity, money = _advance_totals_for_customer(db, customer_id, payload)
        return [
            AdvanceBalanceResponse(
                customer_id=customer_id,
                customer_name=cust.name,
                advance_metal_weight=round(am, 3),
                advance_metal_purity=purity,
                advance_money=round(money, 2),
            )
        ]

    q = (
        db.query(MetalExchange.customer_id, Customer.name)
        .join(Customer, MetalExchange.customer_id == Customer.id)
        .filter(
            MetalExchange.type.in_(["advance_metal", "advance_money"]),
        )
    )
    q = apply_store_filter(q, MetalExchange, payload)
    rows = q.distinct().all()
    result = []
    for cid, customer_name in rows:
        advance_metal, advance_purity, advance_money = _advance_totals_for_customer(db, cid, payload)
        if advance_metal > 0 or advance_money > 0:
            result.append(
                AdvanceBalanceResponse(
                    customer_id=cid,
                    customer_name=customer_name,
                    advance_metal_weight=round(advance_metal, 3),
                    advance_metal_purity=advance_purity,
                    advance_money=round(advance_money, 2),
                )
            )
    return result


@router.get("/{exchange_id}", response_model=MetalExchangeResponse)
def get_exchange(
    exchange_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    rec = db.query(MetalExchange).filter(MetalExchange.id == exchange_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")
    q = db.query(MetalExchange).filter(MetalExchange.id == exchange_id)
    q = apply_store_filter(q, MetalExchange, payload)
    if not q.first():
        raise HTTPException(status_code=404, detail="Not found")
    keys = _schema_keys(MetalExchangeResponse)
    out = {k: getattr(rec, k) for k in keys if hasattr(rec, k)}
    out["customer_name"] = rec.customer.name
    return MetalExchangeResponse(**out)
