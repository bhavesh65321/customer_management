from datetime import datetime, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from config.database import get_db
from core.db_filters import apply_store_filter
from dependencies import require_staff, require_manager
from models.inventory_piece import InventoryPiece
from models.order_repair import Order
from models.transactional import Transaction

router = APIRouter(tags=["Insights"])


@router.get("")
def get_insights(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_manager),
) -> Dict[str, Any]:
    store_id = payload.get("store_id")
    insights: List[Dict[str, Any]] = []

    q_pieces = db.query(InventoryPiece)
    q_pieces = apply_store_filter(q_pieces, InventoryPiece, payload)
    q_pieces = q_pieces.filter(
        InventoryPiece.status == "in_stock",
    )
    old_cutoff = datetime.utcnow() - timedelta(days=90)
    slow = (
        q_pieces.filter(InventoryPiece.created_at < old_cutoff)
        .count()
    )
    if slow > 0:
        insights.append(
            {
                "severity": "info",
                "code": "slow_moving_stock",
                "title": "Slow-moving serialized stock",
                "detail": f"{slow} piece(s) in stock for over 90 days — review pricing or promotion.",
            }
        )

    q_ord = db.query(Order)
    q_ord = apply_store_filter(q_ord, Order, payload)
    pending_cutoff = datetime.utcnow().date() - timedelta(days=7)
    stale_orders = (
        q_ord.filter(
            Order.status.in_(["pending", "in_progress"]),
            Order.expected_date.isnot(None),
            Order.expected_date < pending_cutoff,
        ).count()
    )
    if stale_orders > 0:
        insights.append(
            {
                "severity": "warning",
                "code": "overdue_orders",
                "title": "Orders past expected date",
                "detail": f"{stale_orders} order(s) have an expected date more than a week ago.",
            }
        )

    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    q_tx = db.query(Transaction)
    q_tx = apply_store_filter(q_tx, Transaction, payload)
    q_tx = q_tx.filter(Transaction.date >= month_start)
    mtd = sum(float(t.grand_total or 0) for t in q_tx.all())
    insights.append(
        {
            "severity": "info",
            "code": "mtd_sales",
            "title": "Month-to-date sales",
            "detail": f"₹{mtd:,.2f} billed this month (all transactions in range).",
        }
    )

    return {"generatedAt": datetime.utcnow().isoformat() + "Z", "insights": insights}
