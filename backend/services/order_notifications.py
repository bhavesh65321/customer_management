import os
import logging
from datetime import date, datetime
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from models.order_repair import Order
from services.notification import (
    normalize_phone_e164,
    send_whatsapp_twilio,
    twilio_whatsapp_configured,
)

logger = logging.getLogger(__name__)

STATUS_CUSTOMER_LABELS = {
    "pending": "Received — we will start soon",
    "in_progress": "Work in progress",
    "ready": "Ready for pickup / delivery",
    "delivered": "Delivered — thank you",
}


def _format_expected(d: Optional[date]) -> str:
    if d is None:
        return "to be confirmed"
    if isinstance(d, datetime):
        return d.strftime("%d-%b-%Y")
    return d.strftime("%d-%b-%Y")


def _order_kind(order: Order) -> str:
    return "repair" if order.type == "repair" else "custom order"


def _send_email_plain(to_email: str, subject: str, body: str) -> bool:
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("FROM_EMAIL") or user
    if not host or not user or not password or not to_email or "@" not in to_email:
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_email
        msg["To"] = to_email
        msg.attach(MIMEText(body.strip(), "plain"))
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(from_email, to_email, msg.as_string())
        return True
    except Exception:
        logger.exception("order notification email failed")
        return False


def _send_sms_twilio(phone: str, message: str) -> bool:
    sid = os.getenv("TWILIO_ACCOUNT_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_FROM_NUMBER")
    if not sid or not token or not from_number or not phone or not str(phone).strip():
        return False
    try:
        from twilio.rest import Client

        client = Client(sid, token)
        to_number = normalize_phone_e164(phone)
        if not to_number:
            return False
        client.messages.create(body=message, from_=from_number, to=to_number)
        return True
    except Exception:
        logger.exception("order notification sms failed")
        return False


def _push_order(customer_id: int, title: str, body: str, order_id: int) -> int:
    from config.database import SessionLocal
    from models.push_token import PushToken
    from services.push import send_fcm_multicast

    db = SessionLocal()
    try:
        rows = db.query(PushToken.token).filter(PushToken.customer_id == customer_id).all()
        tokens = [r[0] for r in rows]
        return send_fcm_multicast(
            tokens,
            title,
            body,
            data={"type": "order_status", "order_id": str(order_id)},
        )
    finally:
        db.close()


def notify_customer_order_event(
    db: Session,
    order: Order,
    *,
    event: str,
    old_status: Optional[str] = None,
    new_status: Optional[str] = None,
) -> None:
    customer = order.customer
    if not customer:
        row = (
            db.query(Order)
            .options(joinedload(Order.customer))
            .filter(Order.id == order.id)
            .first()
        )
        customer = row.customer if row else None
    if not customer:
        return

    kind = _order_kind(order)
    oid = order.id
    exp = _format_expected(order.expected_date)

    if event == "created":
        subject = f"{kind.title()} #{oid} registered"
        lines = [
            f"Dear {customer.name},",
            "",
            f"We have registered your {kind} (reference #{oid}).",
            f"Expected date: {exp}.",
            "Current status: Received — we will start soon.",
            "",
            "We will notify you when the status changes.",
            "",
            "Thank you for choosing us.",
        ]
        sms = (
            f"Your {kind} #{oid} is registered. Expected {exp}. Status: Pending. "
            f"We'll update you as it progresses."
        )
        push_title = f"{kind.title()} #{oid}"
        push_body = f"Registered. Expected {exp}. We'll notify you at each step."
    elif event == "status_changed" and new_status:
        label = STATUS_CUSTOMER_LABELS.get(new_status, new_status.replace("_", " ").title())
        subject = f"Update: {kind.title()} #{oid} — {label}"
        lines = [
            f"Dear {customer.name},",
            "",
            f"Your {kind} (reference #{oid}) status is now:",
            label + ".",
            f"Expected date: {exp}.",
            "",
            "Thank you for your patience.",
        ]
        sms = f"Update: {kind} #{oid} is now «{label}». Expected {exp}."
        push_title = f"{kind.title()} #{oid}"
        push_body = label
    else:
        return

    body_text = "\n".join(lines)

    if os.getenv("NOTIFY_ORDER_EMAIL", "1").lower() not in ("0", "false", "no"):
        if customer.email and "@" in customer.email:
            _send_email_plain(customer.email, subject, body_text)

    if os.getenv("NOTIFY_ORDER_SMS", "1").lower() not in ("0", "false", "no"):
        if customer.primary_phone and customer.primary_phone.strip():
            _send_sms_twilio(customer.primary_phone, sms)

    if (
        os.getenv("NOTIFY_ORDER_WHATSAPP", "1").lower() not in ("0", "false", "no")
        and twilio_whatsapp_configured()
        and customer.primary_phone
        and customer.primary_phone.strip()
    ):
        send_whatsapp_twilio(customer.primary_phone, sms)

    if os.getenv("NOTIFY_ORDER_PUSH", "1").lower() not in ("0", "false", "no"):
        _push_order(customer.id, push_title, push_body, oid)


def notify_customer_due_soon(
    db: Session,
    order: Order,
    *,
    overdue: bool,
) -> None:
    customer = order.customer
    if not customer:
        o2 = (
            db.query(Order)
            .options(joinedload(Order.customer))
            .filter(Order.id == order.id)
            .first()
        )
        if not o2 or not o2.customer:
            return
        customer = o2.customer

    kind = _order_kind(order)
    oid = order.id
    exp = _format_expected(order.expected_date)
    if overdue:
        subject = f"Reminder: {kind.title()} #{oid} — due date passed"
        lines = [
            f"Dear {customer.name},",
            "",
            f"Your {kind} (reference #{oid}) had an expected date of {exp}.",
            "We are on it — you will receive another update when it moves forward.",
            "",
            "Thank you for your patience.",
        ]
        sms = f"Reminder: {kind} #{oid} was due {exp}. We're working on it and will update you soon."
    else:
        subject = f"Reminder: {kind.title()} #{oid} — expected soon"
        lines = [
            f"Dear {customer.name},",
            "",
            f"Your {kind} (reference #{oid}) is expected around {exp}.",
            "We will keep you posted on progress.",
            "",
            "Thank you.",
        ]
        sms = f"Reminder: {kind} #{oid} is expected {exp}. We'll update you as it progresses."

    body_text = "\n".join(lines)

    if os.getenv("NOTIFY_ORDER_DUE_REMINDER_EMAIL", "1").lower() not in ("0", "false", "no"):
        if customer.email and "@" in customer.email:
            _send_email_plain(customer.email, subject, body_text)

    if os.getenv("NOTIFY_ORDER_DUE_REMINDER_SMS", "1").lower() not in ("0", "false", "no"):
        if customer.primary_phone and customer.primary_phone.strip():
            _send_sms_twilio(customer.primary_phone, sms)

    if (
        os.getenv("NOTIFY_ORDER_DUE_REMINDER_WHATSAPP", "1").lower() not in ("0", "false", "no")
        and twilio_whatsapp_configured()
        and customer.primary_phone
        and customer.primary_phone.strip()
    ):
        send_whatsapp_twilio(customer.primary_phone, sms)

    if os.getenv("NOTIFY_ORDER_DUE_REMINDER_PUSH", "1").lower() not in ("0", "false", "no"):
        _push_order(
            customer.id,
            f"{kind.title()} #{oid}",
            sms[:120],
            oid,
        )


def run_order_customer_notify_task(order_id: int, event: str, old_status: str = None, new_status: str = None):
    from config.database import SessionLocal

    db = SessionLocal()
    try:
        order = (
            db.query(Order)
            .options(joinedload(Order.customer))
            .filter(Order.id == order_id)
            .first()
        )
        if not order:
            return
        notify_customer_order_event(
            db,
            order,
            event=event,
            old_status=old_status,
            new_status=new_status,
        )
    finally:
        db.close()
