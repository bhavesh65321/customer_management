from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from config.database import get_db
from dependencies import require_staff
from core.db_filters import apply_store_filter
from models.transactional import Transaction

router = APIRouter(tags=["Analytics"])


@router.get("/summary")
def get_summary(
    from_date: str = Query(None, description="YYYY-MM-DD"),
    to_date: str = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(Transaction)
    q = apply_store_filter(q, Transaction, payload)
    if from_date:
        try:
            start = datetime.strptime(from_date, "%Y-%m-%d")
            q = q.filter(Transaction.date >= start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid from_date; use YYYY-MM-DD")
    if to_date:
        try:
            end = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
            q = q.filter(Transaction.date < end)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid to_date; use YYYY-MM-DD")
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
    q = apply_store_filter(q, Transaction, payload)
    if from_date:
        try:
            start = datetime.strptime(from_date, "%Y-%m-%d")
            q = q.filter(Transaction.date >= start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid from_date; use YYYY-MM-DD")
    if to_date:
        try:
            end = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
            q = q.filter(Transaction.date < end)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid to_date; use YYYY-MM-DD")
    q = q.group_by(func.date(Transaction.date))
    rows = q.all()
    return [
        {"date": str(r.day), "count": r.count, "total": round(float(r.total), 2)}
        for r in rows
    ]


@router.get("/monthly")
def get_monthly(
    year: int = Query(None, description="Filter by year e.g. 2024"),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(
        extract("year", Transaction.date).label("year"),
        extract("month", Transaction.date).label("month"),
        func.count(Transaction.id).label("count"),
        func.coalesce(func.sum(Transaction.grand_total), 0).label("total"),
    )
    q = apply_store_filter(q, Transaction, payload)
    if year is not None:
        q = q.filter(extract("year", Transaction.date) == year)
    q = q.group_by(extract("year", Transaction.date), extract("month", Transaction.date))
    rows = q.all()
    return [
        {
            "year": int(r.year),
            "month": int(r.month),
            "count": r.count,
            "total": round(float(r.total), 2),
        }
        for r in rows
    ]


@router.get("/yearly")
def get_yearly(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(
        extract("year", Transaction.date).label("year"),
        func.count(Transaction.id).label("count"),
        func.coalesce(func.sum(Transaction.grand_total), 0).label("total"),
    )
    q = apply_store_filter(q, Transaction, payload)
    q = q.group_by(extract("year", Transaction.date))
    rows = q.all()
    return [
        {"year": int(r.year), "count": r.count, "total": round(float(r.total), 2)}
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
        raise HTTPException(status_code=400, detail="Invalid date; use YYYY-MM-DD")
    q = db.query(Transaction).filter(
        Transaction.date >= day_start,
        Transaction.date < day_end,
    )
    q = apply_store_filter(q, Transaction, payload)
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


@router.get("/customer-analytics")
def get_customer_analytics(
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    q = (
        db.query(
            Transaction.customer_id,
            Transaction.customer_name,
            func.count(Transaction.id).label("transaction_count"),
            func.coalesce(func.sum(Transaction.grand_total), 0).label("total_spent"),
            func.coalesce(func.sum(Transaction.due_amount), 0).label("total_due"),
        )
        .group_by(Transaction.customer_id, Transaction.customer_name)
    )
    q = apply_store_filter(q, Transaction, payload)
    rows = q.order_by(func.sum(Transaction.grand_total).desc()).limit(limit).all()
    return [
        {
            "customerId": r.customer_id,
            "customerName": r.customer_name,
            "transactionCount": r.transaction_count,
            "totalSpent": round(float(r.total_spent), 2),
            "totalDue": round(float(r.total_due), 2),
        }
        for r in rows
    ]
