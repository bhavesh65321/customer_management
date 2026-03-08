from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from config.database import get_db
from dependencies import require_staff
from models.transactional import Transaction

router = APIRouter(tags=["Analytics"])


def _analytics_store_filter(q, payload):
    store_id = payload.get("store_id")
    if store_id is not None:
        q = q.filter(Transaction.store_id == store_id)
    else:
        q = q.filter(Transaction.store_id.is_(None))
    return q


@router.get("/summary")
def get_summary(
    from_date: str = Query(None, description="YYYY-MM-DD"),
    to_date: str = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(Transaction)
    q = _analytics_store_filter(q, payload)
    if from_date:
        try:
            start = datetime.strptime(from_date, "%Y-%m-%d")
            q = q.filter(Transaction.date >= start)
        except ValueError:
            pass
    if to_date:
        try:
            end = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
            q = q.filter(Transaction.date < end)
        except ValueError:
            pass
    rows = q.all()
    total_amount = sum(t.grand_total or 0 for t in rows)
    total_paid = sum(t.paid_amount or 0 for t in rows)
    total_due = sum(t.due_amount or 0 for t in rows)
    return {
        "count": len(rows),
        "totalAmount": round(total_amount, 2),
        "totalPaid": round(total_paid, 2),
        "totalDue": round(total_due, 2),
    }


@router.get("/daily")
def get_daily(
    from_date: str = Query(None, description="YYYY-MM-DD"),
    to_date: str = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(
        func.date(Transaction.date).label("day"),
        func.count(Transaction.id).label("count"),
        func.coalesce(func.sum(Transaction.grand_total), 0).label("total"),
    )
    q = _analytics_store_filter(q, payload)
    if from_date:
        try:
            start = datetime.strptime(from_date, "%Y-%m-%d")
            q = q.filter(Transaction.date >= start)
        except ValueError:
            pass
    if to_date:
        try:
            end = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
            q = q.filter(Transaction.date < end)
        except ValueError:
            pass
    q = q.group_by(func.date(Transaction.date))
    rows = q.all()
    return [
        {"date": str(r.day), "count": r.count, "total": round(float(r.total), 2)}
        for r in rows
    ]


@router.get("/daily-sales")
def get_daily_sales(
    date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    try:
        day_start = datetime.strptime(date, "%Y-%m-%d")
        day_end = day_start + timedelta(days=1)
    except ValueError:
        return []
    q = db.query(Transaction).filter(
        Transaction.date >= day_start,
        Transaction.date < day_end,
    )
    q = _analytics_store_filter(q, payload)
    txns = q.order_by(Transaction.date.desc()).all()
    return [
        {
            "id": t.id,
            "customerId": t.customer_id,
            "customerName": t.customer_name,
            "grandTotal": t.grand_total,
            "paidAmount": t.paid_amount,
            "dueAmount": t.due_amount,
            "date": t.date.isoformat() if t.date else None,
        }
        for t in txns
    ]
