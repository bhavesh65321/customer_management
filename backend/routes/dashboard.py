from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from config.database import get_db
from dependencies import require_staff
from core.db_filters import apply_store_filter
from models.transactional import Transaction
from models.order_repair import Order
from models.stock_item import StockItem
from models.audit_log import AuditLog

router = APIRouter(tags=["Dashboard"])

# Human-readable activity messages
_ACTION_MAP = {
    "created":       "added",
    "updated":       "updated",
    "deleted":       "removed",
    "timeline_note": "updated",
    "sent":          "sent",
}
_ENTITY_MAP = {
    "transaction":       "Bill",
    "customer":          "Customer",
    "order":             "Order",
    "karigar":           "Karigar",
    "inventory_piece":   "Piece",
    "stock_item":        "Stock item",
    "girvi":             "Girvi loan",
    "payment":           "Payment",
    "worker":            "Worker",
}


def _human(row: AuditLog) -> str:
    """Turn an audit log row into plain English."""
    if row.message and len(row.message.strip()) > 4:
        return row.message.strip()
    entity = _ENTITY_MAP.get(row.entity_type, row.entity_type.replace("_", " ").title())
    action = _ACTION_MAP.get(row.action, row.action)
    return f"{entity} #{row.entity_id} {action}"


@router.get("")
def get_dashboard(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ── Revenue KPIs ──────────────────────────────────────────────────────
    def txn_q():
        q = db.query(Transaction)
        return apply_store_filter(q, Transaction, payload)

    today_txns = txn_q().filter(Transaction.date >= today_start).all()
    month_txns = txn_q().filter(Transaction.date >= month_start).all()
    yesterday_start = today_start - timedelta(days=1)
    yesterday_txns = txn_q().filter(
        Transaction.date >= yesterday_start,
        Transaction.date < today_start,
    ).all()

    today_revenue = round(sum(t.grand_total or 0 for t in today_txns), 2)
    today_bills   = len(today_txns)
    month_revenue = round(sum(t.grand_total or 0 for t in month_txns), 2)
    month_bills   = len(month_txns)
    yesterday_rev = round(sum(t.grand_total or 0 for t in yesterday_txns), 2)

    # Revenue change vs yesterday
    if yesterday_rev > 0:
        rev_change_pct = round(((today_revenue - yesterday_rev) / yesterday_rev) * 100, 1)
    else:
        rev_change_pct = None

    # ── Pending dues ──────────────────────────────────────────────────────
    due_q = txn_q().filter(Transaction.due_amount > 0)
    due_txns = due_q.all()
    total_pending_due   = round(sum(t.due_amount or 0 for t in due_txns), 2)
    pending_due_customers = len(set(t.customer_id for t in due_txns if t.customer_id))

    # ── Orders ────────────────────────────────────────────────────────────
    def order_q():
        q = db.query(Order)
        return apply_store_filter(q, Order, payload)

    ready_orders = order_q().filter(Order.status == "ready").count()

    overdue_orders = []
    try:
        overdue = order_q().filter(
            Order.status.in_(["pending", "in_progress"]),
            Order.expected_date < today_start,
        ).order_by(Order.expected_date.asc()).limit(5).all()
        for o in overdue:
            days_late = (now - o.expected_date).days if o.expected_date else 0
            overdue_orders.append({
                "id": o.id,
                "customer_name": o.customer_name,
                "description": getattr(o, "description", None) or getattr(o, "item_description", None) or "",
                "days_late": days_late,
                "expected_date": o.expected_date.strftime("%d %b") if o.expected_date else None,
            })
    except Exception:
        pass

    # ── Low stock ─────────────────────────────────────────────────────────
    low_stock_alerts = []
    try:
        stock_q = db.query(StockItem)
        stock_q = apply_store_filter(stock_q, StockItem, payload)
        items = stock_q.all()
        for item in items:
            qty = getattr(item, "quantity", None)
            min_qty = getattr(item, "minimum_quantity", None) or getattr(item, "reorder_point", None)
            if qty is not None and min_qty is not None and qty <= min_qty:
                low_stock_alerts.append({
                    "id": item.id,
                    "name": item.name,
                    "quantity": qty,
                    "minimum_quantity": min_qty,
                })
    except Exception:
        pass

    # ── 7-day revenue chart ───────────────────────────────────────────────
    chart_data = []
    for i in range(6, -1, -1):
        day = today_start - timedelta(days=i)
        day_end = day + timedelta(days=1)
        rev = db.query(func.coalesce(func.sum(Transaction.grand_total), 0)).filter(
            Transaction.date >= day,
            Transaction.date < day_end,
        )
        rev = apply_store_filter(rev, Transaction, payload)
        total = float(rev.scalar() or 0)
        chart_data.append({
            "date": day.strftime("%d %b"),
            "day": day.strftime("%a"),
            "total": round(total, 2),
            "is_today": i == 0,
        })

    # ── Today's activity feed ─────────────────────────────────────────────
    activity = []
    try:
        store_id = payload.get("store_id")
        act_q = db.query(AuditLog).filter(
            AuditLog.created_at >= today_start,
        ).order_by(desc(AuditLog.created_at)).limit(12)
        if store_id is not None:
            act_q = act_q.filter(AuditLog.store_id == store_id)
        for row in act_q.all():
            activity.append({
                "id": row.id,
                "time": row.created_at.strftime("%I:%M %p").lstrip("0") if row.created_at else "",
                "text": _human(row),
                "entity_type": row.entity_type,
            })
    except Exception:
        pass

    # ── Today's bills list ────────────────────────────────────────────────
    today_bills_list = [
        {
            "id": t.id,
            "customer_name": t.customer_name or "—",
            "grand_total": t.grand_total,
            "due_amount": t.due_amount,
            "time": t.date.strftime("%I:%M %p").lstrip("0") if t.date else "",
        }
        for t in sorted(today_txns, key=lambda x: x.date or datetime.min, reverse=True)[:8]
    ]

    return {
        "kpis": {
            "today_revenue": today_revenue,
            "today_bills": today_bills,
            "month_revenue": month_revenue,
            "month_bills": month_bills,
            "rev_change_pct": rev_change_pct,
            "total_pending_due": total_pending_due,
            "pending_due_customers": pending_due_customers,
            "ready_orders": ready_orders,
        },
        "alerts": {
            "overdue_orders": overdue_orders,
            "low_stock": low_stock_alerts,
        },
        "chart": chart_data,
        "today_bills": today_bills_list,
        "activity": activity,
    }
