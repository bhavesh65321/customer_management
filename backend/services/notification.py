import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime


def _format_date(dt):
    if dt is None:
        return ""
    if isinstance(dt, datetime):
        return dt.strftime("%d-%b-%Y %I:%M %p")
    return str(dt)


def send_purchase_order_email(
    to_email: str,
    customer_name: str,
    transaction_id: int,
    date,
    products_summary: str,
    grand_total: float,
    paid_amount: float,
    due_amount: float,
) -> bool:
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("FROM_EMAIL") or user
    if not host or not user or not password or not to_email or "@" not in to_email:
        return False
    subject = f"Purchase Order #{transaction_id} - {customer_name}"
    body_plain = f"""
Purchase Order #{transaction_id}

Customer: {customer_name}
Date: {_format_date(date)}

{products_summary}

Grand Total: ₹{grand_total:.2f}
Paid: ₹{paid_amount:.2f}
Due: ₹{due_amount:.2f}

Thank you for your order.
"""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_email
        msg["To"] = to_email
        msg.attach(MIMEText(body_plain.strip(), "plain"))
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(from_email, to_email, msg.as_string())
        return True
    except Exception:
        return False


def send_purchase_order_sms(
    phone: str,
    customer_name: str,
    transaction_id: int,
    grand_total: float,
) -> bool:
    sid = os.getenv("TWILIO_ACCOUNT_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_FROM_NUMBER")
    if not sid or not token or not from_number or not phone or not phone.strip():
        return False
    message = (
        f"Your purchase order #{transaction_id} for ₹{grand_total:.2f} has been recorded. Thank you!"
    )
    try:
        from twilio.rest import Client
        client = Client(sid, token)
        to_number = phone.strip()
        if not to_number.startswith("+"):
            to_number = "+91" + to_number.lstrip("0")
        client.messages.create(body=message, from_=from_number, to=to_number)
        return True
    except Exception:
        return False


def send_purchase_order_notifications(
    customer_email: str,
    customer_phone: str,
    customer_name: str,
    transaction_id: int,
    date,
    products_list: list,
    grand_total: float,
    paid_amount: float,
    due_amount: float,
):
    products_summary_lines = []
    for i, p in enumerate(products_list or [], 1):
        name = p.get("productName") or "-"
        total = p.get("total")
        try:
            total_str = f"₹{float(total):.2f}" if total is not None else "-"
        except (TypeError, ValueError):
            total_str = "-"
        products_summary_lines.append(f"  {i}. {name}: {total_str}")
    products_summary = "\n".join(products_summary_lines) if products_summary_lines else "No items"

    if customer_email and "@" in customer_email:
        send_purchase_order_email(
            to_email=customer_email,
            customer_name=customer_name,
            transaction_id=transaction_id,
            date=date,
            products_summary=products_summary,
            grand_total=grand_total,
            paid_amount=paid_amount,
            due_amount=due_amount,
        )
    if customer_phone and customer_phone.strip():
        send_purchase_order_sms(
            phone=customer_phone,
            customer_name=customer_name,
            transaction_id=transaction_id,
            grand_total=grand_total,
        )


def send_payment_reminder_email(to_email: str, customer_name: str, total_due: float, bill_count: int) -> bool:
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("FROM_EMAIL") or user
    if not host or not user or not password or not to_email or "@" not in to_email:
        return False
    subject = f"Payment reminder - outstanding balance ₹{total_due:.2f}"
    body_plain = f"""
Dear {customer_name},

This is a friendly reminder that you have an outstanding balance of ₹{total_due:.2f} across {bill_count} bill(s).

Please clear the dues at your earliest convenience.

Thank you.
"""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_email
        msg["To"] = to_email
        msg.attach(MIMEText(body_plain.strip(), "plain"))
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(from_email, to_email, msg.as_string())
        return True
    except Exception:
        return False


def send_payment_reminder_sms(phone: str, customer_name: str, total_due: float) -> bool:
    sid = os.getenv("TWILIO_ACCOUNT_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_FROM_NUMBER")
    if not sid or not token or not from_number or not phone or not phone.strip():
        return False
    message = f"Hi {customer_name}, your outstanding balance is ₹{total_due:.2f}. Please clear at your earliest."
    try:
        from twilio.rest import Client
        client = Client(sid, token)
        to_number = phone.strip()
        if not to_number.startswith("+"):
            to_number = "+91" + to_number.lstrip("0")
        client.messages.create(body=message, from_=from_number, to=to_number)
        return True
    except Exception:
        return False
