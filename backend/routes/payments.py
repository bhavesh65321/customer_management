from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from config.database import get_db
from dependencies import require_staff
from core.db_filters import apply_store_filter
from models.transactional import Transaction
from models.payment import Payment
from models.customer import Customer
from typing import Optional

router = APIRouter(tags=["Payments"])


@router.get("/outstanding")
def get_outstanding(
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = (
        db.query(Transaction, Customer)
        .outerjoin(Customer, Customer.id == Transaction.customer_id)
        .filter(Transaction.due_amount > 0)
    )
    q = apply_store_filter(q, Transaction, payload)
    total_due = db.query(
        func.coalesce(func.sum(Transaction.due_amount), 0)
    ).filter(Transaction.due_amount > 0).scalar() or 0.0
    rows = q.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()
    return {
        "items": [
            {
                "id": t.id,
                "customerId": t.customer_id,
                "customerName": t.customer_name,
                "phone": (c.primary_phone if c else None),
                "grandTotal": float(t.grand_total or 0),
                "paidAmount": float(t.paid_amount or 0),
                "dueAmount": float(t.due_amount or 0),
                "date": t.date.isoformat() if t.date else None,
            }
            for t, c in rows
        ],
        "totalDue": round(float(total_due), 2),
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
    q = apply_store_filter(q, Transaction, payload)
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
