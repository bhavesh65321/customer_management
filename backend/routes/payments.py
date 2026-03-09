from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from config.database import get_db
from dependencies import require_staff
from core.db_filters import apply_store_filter
from models.transactional import Transaction
from models.payment import Payment
from typing import Optional

router = APIRouter(tags=["Payments"])


@router.get("/outstanding")
def get_outstanding(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = (
        db.query(Transaction)
        .filter(Transaction.due_amount > 0)
    )
    q = apply_store_filter(q, Transaction, payload)
    rows = q.order_by(Transaction.date.desc()).all()
    total_due = sum(float(t.due_amount or 0) for t in rows)
    return {
        "items": [
            {
                "id": t.id,
                "customerId": t.customer_id,
                "customerName": t.customer_name,
                "grandTotal": float(t.grand_total or 0),
                "paidAmount": float(t.paid_amount or 0),
                "dueAmount": float(t.due_amount or 0),
                "date": t.date.isoformat() if t.date else None,
            }
            for t in rows
        ],
        "totalDue": round(total_due, 2),
        "count": len(rows),
    }


@router.get("/history")
def get_payment_history(
    customer_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    q = db.query(Payment).join(Transaction)
    if store_id is not None:
        q = q.filter(Transaction.store_id == store_id)
    else:
        q = q.filter(Transaction.store_id.is_(None))
    if customer_id is not None:
        q = q.filter(Transaction.customer_id == customer_id)
    q = q.order_by(desc(Payment.created_at)).limit(limit)
    payments = q.all()
    out = []
    for p in payments:
        t = p.transaction
        out.append({
            "id": p.id,
            "transactionId": t.id,
            "customerId": t.customer_id,
            "customerName": t.customer_name,
            "amount": float(p.amount),
            "paymentMode": p.payment_mode,
            "createdAt": p.created_at.isoformat() if p.created_at else None,
            "billTotal": float(t.grand_total or 0),
            "paidAfter": float(t.paid_amount or 0),
            "dueAfter": float(t.due_amount or 0),
        })
    return out
