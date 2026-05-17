from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from core.db_filters import apply_store_filter
from models.customer import Customer
from models.girvi_loan import GirviLoan
from models.inventory_piece import InventoryPiece
from models.metal_exchange import MetalExchange
from models.order_repair import Order
from models.stock_item import StockItem, StockMovement
from models.transactional import Transaction


def _current_quantity(db: Session, item_id: int) -> float:
    r = (
        db.query(func.coalesce(func.sum(StockMovement.quantity), 0))
        .filter(StockMovement.item_id == item_id)
        .scalar()
    )
    return float(r or 0)


def _tx_aggregate(
    db: Session, payload: dict, start: datetime, end: datetime
) -> Tuple[int, float, float, float]:
    q = (
        db.query(
            func.count(Transaction.id),
            func.coalesce(func.sum(Transaction.grand_total), 0),
            func.coalesce(func.sum(Transaction.paid_amount), 0),
            func.coalesce(func.sum(Transaction.due_amount), 0),
        )
    )
    q = apply_store_filter(q, Transaction, payload)
    q = q.filter(Transaction.date >= start, Transaction.date < end)
    row = q.one()
    return (
        int(row[0] or 0),
        float(row[1] or 0),
        float(row[2] or 0),
        float(row[3] or 0),
    )


def _period_block(
    db: Session, payload: dict, start: datetime, end: datetime
) -> Dict[str, Any]:
    c, g, p, d = _tx_aggregate(db, payload, start, end)
    return {
        "bills_count": c,
        "billed_total_inr": round(g, 2),
        "collected_inr": round(p, 2),
        "outstanding_due_inr": round(d, 2),
    }


def _low_stock_count(db: Session, payload: dict, limit_items: int = 400) -> int:
    q = db.query(StockItem)
    q = apply_store_filter(q, StockItem, payload)
    items = q.limit(limit_items).all()
    n = 0
    for item in items:
        if item.min_quantity is None:
            continue
        qty = _current_quantity(db, item.id)
        if qty < item.min_quantity:
            n += 1
    return n


def build_business_snapshot(db: Session, payload: dict) -> Dict[str, Any]:
    now = datetime.utcnow()
    day = timedelta(days=1)
    start_30 = now - timedelta(days=30)
    start_60 = now - timedelta(days=60)
    start_90 = now - timedelta(days=90)
    prev_30_start = now - timedelta(days=60)
    prev_30_end = now - timedelta(days=30)

    last_30 = _period_block(db, payload, start_30, now)
    last_90 = _period_block(db, payload, start_90, now)
    prev_30 = _period_block(db, payload, prev_30_start, prev_30_end)

    trend_billed_pct: Optional[float] = None
    if prev_30["billed_total_inr"] > 0:
        trend_billed_pct = round(
            100.0
            * (last_30["billed_total_inr"] - prev_30["billed_total_inr"])
            / prev_30["billed_total_inr"],
            1,
        )

    def _customers_q() -> Any:
        q = db.query(Customer)
        return apply_store_filter(q, Customer, payload)

    active_customers = _customers_q().filter(Customer.is_active == True).count()  # noqa: E712
    inactive_customers = _customers_q().filter(Customer.is_active == False).count()  # noqa: E712

    def _orders_q() -> Any:
        q = db.query(Order)
        return apply_store_filter(q, Order, payload)

    orders_pending = _orders_q().filter(Order.status == "pending").count()
    orders_in_progress = _orders_q().filter(Order.status == "in_progress").count()
    orders_ready = _orders_q().filter(Order.status == "ready").count()
    overdue_cutoff = now.date() - timedelta(days=7)
    stale_orders = (
        _orders_q()
        .filter(
            Order.status.in_(["pending", "in_progress"]),
            Order.expected_date.isnot(None),
            Order.expected_date < overdue_cutoff,
        )
        .count()
    )

    def _pieces_q() -> Any:
        q = db.query(InventoryPiece)
        return apply_store_filter(q, InventoryPiece, payload)

    pieces_in_stock = _pieces_q().filter(InventoryPiece.status == "in_stock").count()
    pieces_listed = _pieces_q().filter(InventoryPiece.status == "listed").count()
    old_cutoff = now - timedelta(days=90)
    slow_pieces = (
        _pieces_q()
        .filter(
            InventoryPiece.status == "in_stock",
            InventoryPiece.created_at < old_cutoff,
        )
        .count()
    )

    gq = db.query(GirviLoan)
    gq = apply_store_filter(gq, GirviLoan, payload)
    gq_active = gq.filter(GirviLoan.status == "active")
    girvi_active_count = gq_active.count()
    principal_sum = db.query(func.coalesce(func.sum(GirviLoan.principal_amount), 0))
    principal_sum = apply_store_filter(principal_sum, GirviLoan, payload)
    principal_sum = principal_sum.filter(GirviLoan.status == "active").scalar()
    girvi_principal_inr = round(float(principal_sum or 0), 2)

    mq = db.query(func.count(MetalExchange.id)).join(
        Customer, MetalExchange.customer_id == Customer.id
    )
    mq = apply_store_filter(mq, MetalExchange, payload)
    mq = mq.filter(MetalExchange.exchange_date >= start_90)
    metal_tx_90d = int(mq.scalar() or 0)

    low_stock = _low_stock_count(db, payload)

    daily_series: List[Dict[str, Any]] = []
    dq = (
        db.query(
            func.date(Transaction.date).label("day"),
            func.count(Transaction.id).label("cnt"),
            func.coalesce(func.sum(Transaction.grand_total), 0).label("tot"),
        )
    )
    dq = apply_store_filter(dq, Transaction, payload)
    dq = dq.filter(Transaction.date >= start_90, Transaction.date < now)
    dq = dq.group_by(func.date(Transaction.date))
    for r in dq.order_by(func.date(Transaction.date)).all():
        daily_series.append(
            {
                "date": str(r.day),
                "bills": int(r.cnt or 0),
                "billed_inr": round(float(r.tot or 0), 2),
            }
        )

    return {
        "generated_at_utc": now.isoformat() + "Z",
        "currency": "INR",
        "business_type": "jewellery_retail_india",
        "sales": {
            "last_30_days": last_30,
            "previous_30_days": prev_30,
            "last_90_days": last_90,
            "billed_trend_vs_prior_30d_pct": trend_billed_pct,
            "daily_bills_last_90_days": daily_series,
        },
        "customers": {
            "active_count": active_customers,
            "inactive_count": inactive_customers,
        },
        "orders_repairs": {
            "pending": orders_pending,
            "in_progress": orders_in_progress,
            "ready": orders_ready,
            "overdue_vs_expected_date": stale_orders,
        },
        "serialized_jewellery": {
            "pieces_in_stock": pieces_in_stock,
            "pieces_listed": pieces_listed,
            "slow_moving_in_stock_over_90_days": slow_pieces,
        },
        "girvi_loans": {
            "active_count": girvi_active_count,
            "active_principal_inr": girvi_principal_inr,
        },
        "metal_exchange": {"transactions_last_90_days": metal_tx_90d},
        "stock_items": {"low_stock_skus_count": low_stock},
    }
