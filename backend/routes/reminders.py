from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from config.database import get_db
from dependencies import require_staff
from core.db_filters import apply_store_filter
from models.transactional import Transaction
from models.customer import Customer
import os

from services.notification import (
    notify_customer_payment_reminder_push,
    send_payment_reminder_email,
    send_payment_reminder_sms,
    send_payment_reminder_whatsapp,
    twilio_whatsapp_configured,
)
from typing import Optional

from utils.activity import log_activity

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
            Customer.primary_phone,
        )
        .outerjoin(Customer, Customer.id == Transaction.customer_id)
        .filter(Transaction.due_amount > 0)
        .group_by(Transaction.customer_id, Transaction.customer_name, Customer.primary_phone)
    )
    q = apply_store_filter(q, Transaction, payload)
    rows = q.all()
    return [
        {
            "customerId": r.customer_id,
            "customerName": r.customer_name,
            "billCount": r.bill_count,
            "totalDue": round(float(r.total_due), 2),
            "phone": r.primary_phone,
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
            Customer.email,
            Customer.primary_phone,
            Customer.id.label("cust_id"),
        )
        .outerjoin(Customer, Customer.id == Transaction.customer_id)
        .filter(Transaction.due_amount > 0)
        .group_by(
            Transaction.customer_id,
            Transaction.customer_name,
            Customer.email,
            Customer.primary_phone,
            Customer.id,
        )
    )
    q = apply_store_filter(q, Transaction, payload)
    if customer_id is not None:
        q = q.filter(Transaction.customer_id == customer_id)
    rows = q.all()
    wa_reminder = os.getenv("NOTIFY_WHATSAPP_ON_REMINDER", "1").lower() not in ("0", "false", "no")
    channels = {"email": 0, "sms": 0, "whatsapp": 0, "push": 0}
    for r in rows:
        if not r.cust_id:
            continue
        total_due = float(r.total_due)
        bill_count = r.bill_count
        name = r.customer_name or ""
        if r.email and "@" in r.email:
            if send_payment_reminder_email(r.email, name, total_due, bill_count):
                channels["email"] += 1
        if r.primary_phone and r.primary_phone.strip():
            if send_payment_reminder_sms(r.primary_phone, name, total_due):
                channels["sms"] += 1
        if (
            r.primary_phone
            and r.primary_phone.strip()
            and twilio_whatsapp_configured()
            and wa_reminder
        ):
            if send_payment_reminder_whatsapp(r.primary_phone, name, total_due):
                channels["whatsapp"] += 1
        if os.getenv("NOTIFY_PUSH_ON_REMINDER", "1").lower() not in ("0", "false", "no"):
            channels["push"] += notify_customer_payment_reminder_push(r.cust_id, total_due, bill_count)
    total_sent = sum(channels.values())
    log_activity(
        db,
        payload,
        action="sent",
        entity_type="reminder",
        entity_id=None,
        message=f"Sent payment reminders: {len(rows)} customer(s), {total_sent} notification(s) (email/SMS/WhatsApp/push)",
        store_id=store_id,
    )
    return {
        "message": "Reminders sent",
        "customersProcessed": len(rows),
        "notificationsSent": total_sent,
        "channels": channels,
    }
