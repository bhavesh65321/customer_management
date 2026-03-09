from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from config.database import get_db
from dependencies import require_staff
from core.db_filters import apply_store_filter
from models.transactional import Transaction
from models.customer import Customer
from services.notification import send_payment_reminder_email, send_payment_reminder_sms
from typing import Optional

router = APIRouter(tags=["Reminders"])


@router.get("/outstanding-summary")
def get_reminder_outstanding_summary(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = (
        db.query(
            Transaction.customer_id,
            Transaction.customer_name,
            func.count(Transaction.id).label("bill_count"),
            func.coalesce(func.sum(Transaction.due_amount), 0).label("total_due"),
        )
        .filter(Transaction.due_amount > 0)
        .group_by(Transaction.customer_id, Transaction.customer_name)
    )
    q = apply_store_filter(q, Transaction, payload)
    rows = q.all()
    return [
        {
            "customerId": r.customer_id,
            "customerName": r.customer_name,
            "billCount": r.bill_count,
            "totalDue": round(float(r.total_due), 2),
        }
        for r in rows
    ]


@router.post("/send")
def send_reminders(
    customer_id: Optional[int] = Query(None, description="Send only to this customer"),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    q = (
        db.query(
            Transaction.customer_id,
            Transaction.customer_name,
            func.count(Transaction.id).label("bill_count"),
            func.coalesce(func.sum(Transaction.due_amount), 0).label("total_due"),
        )
        .filter(Transaction.due_amount > 0)
        .group_by(Transaction.customer_id, Transaction.customer_name)
    )
    q = apply_store_filter(q, Transaction, payload)
    if customer_id is not None:
        q = q.filter(Transaction.customer_id == customer_id)
    rows = q.all()
    sent = 0
    for r in rows:
        cust = db.query(Customer).filter(Customer.id == r.customer_id).first()
        if not cust:
            continue
        total_due = float(r.total_due)
        bill_count = r.bill_count
        name = r.customer_name or (cust.name if cust else "")
        if cust.email and "@" in cust.email:
            if send_payment_reminder_email(cust.email, name, total_due, bill_count):
                sent += 1
        if cust.primary_phone and cust.primary_phone.strip():
            if send_payment_reminder_sms(cust.primary_phone, name, total_due):
                sent += 1
    return {"message": "Reminders sent", "customersProcessed": len(rows), "notificationsSent": sent}
