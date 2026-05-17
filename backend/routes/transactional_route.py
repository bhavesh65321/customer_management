from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from config.database import get_db
from dependencies import require_staff
from controllers.transaction_controller import create_transaction, get_transactions, update_transaction
from schemas.transaction_schema import TransactionCreate, TransactionResponse, TransactionUpdate
from models.transactional import Transaction
from models.invoice import Invoice
from models.payment import Payment
from models.store import Store
from models.customer import Customer
from models.idempotency import PaymentIdempotency
from pydantic import BaseModel
from utils.pdf_invoice import build_purchase_order_pdf
from services.piece_lifecycle import record_piece_sale_events
from services.notification import send_purchase_order_notifications
from utils.activity import log_activity
from utils.gst_utils import calculate_gst, get_financial_year, generate_invoice_number
from typing import List, Optional
import json

router = APIRouter(tags=["Transactions"])


def _get_transaction_for_staff(transaction_id: int, db: Session, payload: dict):
    t = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    store_id = payload.get("store_id")
    role = payload.get("role", "staff")
    # Admin with no store_id can access all transactions
    if role == "admin" and store_id is None:
        return t
    if store_id is not None and t.store_id != store_id:
        raise HTTPException(status_code=403, detail="Not authorized for this transaction")
    if store_id is None and t.store_id is not None:
        raise HTTPException(status_code=403, detail="Not authorized for this transaction")
    return t


@router.get("/invoice/{transaction_id}")
def get_invoice(
    transaction_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    t = _get_transaction_for_staff(transaction_id, db, payload)
    inv = db.query(Invoice).filter(Invoice.transaction_id == transaction_id).first()
    products = [
        {
            "productName": p.get("productName"),
            "metalType": p.get("metalType"),
            "weight": p.get("weight"),
            "qty": p.get("qty"),
            "rate": p.get("rate"),
            "makingCharge": p.get("makingCharge"),
            "diamondCharge": p.get("diamondCharge"),
            "gstPercent": p.get("gstPercent"),
            "total": p.get("total"),
        }
        for p in (t.products or [])
    ]
    store_name = None
    store_address = None
    store_phone = None
    store_email = None
    store_gstin = None
    if t.store_id:
        store = db.query(Store).filter(Store.id == t.store_id).first()
        if store:
            store_name    = store.name
            store_address = store.address
            store_phone   = store.contact_phone
            store_email   = store.owner_email
            store_gstin   = store.gstin
    return {
        "transaction": {
            "id": t.id,
            "invoiceNumber": t.invoice_number,
            "customerName": t.customer_name,
            "customerGstin": t.customer_gstin,
            "grandTotal": t.grand_total,
            "paidAmount": t.paid_amount,
            "dueAmount": t.due_amount,
            "date": t.date.isoformat() if t.date else None,
            "billType": t.bill_type,
            "paymentMode": t.payment_mode,
            "products": products,
            # GST fields
            "gstComputed": t.gst_computed,
            "taxableValue": t.taxable_value,
            "makingCharges": t.making_charges,
            "cgstAmount": t.cgst_amount,
            "sgstAmount": t.sgst_amount,
            "igstAmount": t.igst_amount,
            "makingCgst": t.making_cgst,
            "makingSgst": t.making_sgst,
            "taxRate": t.tax_rate,
            "isInterstate": t.is_interstate,
            "hsnCode": t.hsn_code,
        },
        "invoice": {"id": inv.id, "irn": inv.irn} if inv else None,
        "storeName": store_name,
        "storeAddress": store_address,
        "storePhone": store_phone,
        "storeEmail": store_email,
        "storeGstin": store_gstin,
    }


@router.get("/invoice/{transaction_id}/pdf")
def get_invoice_pdf(
    transaction_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    t = _get_transaction_for_staff(transaction_id, db, payload)
    store_name = None
    if t.store_id:
        store = db.query(Store).filter(Store.id == t.store_id).first()
        if store:
            store_name = store.name
    store_obj = None
    if t.store_id:
        store_obj = db.query(Store).filter(Store.id == t.store_id).first()
    pdf_bytes = build_purchase_order_pdf(t, store=store_obj)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="purchase-order-{transaction_id}.pdf"'},
    )


@router.post("/add")
def save_transaction(
    transaction: TransactionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    customer = db.query(Customer).filter(Customer.id == transaction.customerId).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if store_id is not None and customer.store_id != store_id:
        raise HTTPException(status_code=403, detail="Customer does not belong to your store")
    db_transaction = create_transaction(db, transaction, store_id=store_id)

    # ── Auto-compute GST if HSN code provided ──────────────────────────────
    gst_in = getattr(transaction, "gst", None)
    if gst_in and getattr(gst_in, "hsn_code", None):
        store = db.query(Store).filter(Store.id == store_id).first() if store_id else None
        hsn = gst_in.hsn_code or (store.default_hsn_gold if store else "7113")
        making_hsn = "9988"
        if store and store.default_hsn_making:
            making_hsn = store.default_hsn_making

        gst_result = calculate_gst(
            item_value=float(db_transaction.grand_total or 0) - float(gst_in.making_charges or 0),
            making_charges=float(gst_in.making_charges or 0),
            hsn_code=hsn,
            making_hsn_code=making_hsn,
            is_interstate=bool(gst_in.is_interstate),
        )

        # Generate invoice number using store prefix + financial year + sequence
        inv_number = None
        if store and store.invoice_prefix:
            from datetime import datetime
            now = db_transaction.date or datetime.utcnow()
            fy = get_financial_year(now.year, now.month)
            store.invoice_seq_current = (store.invoice_seq_current or 0) + 1
            seq = store.invoice_seq_current
            inv_number = generate_invoice_number(store.invoice_prefix, fy, seq)

        db_transaction.gst_computed = True
        db_transaction.hsn_code = hsn
        db_transaction.making_hsn_code = making_hsn
        db_transaction.tax_rate = gst_result["tax_rate"]
        db_transaction.making_tax_rate = gst_result["making_tax_rate"]
        db_transaction.taxable_value = gst_result["taxable_value"]
        db_transaction.making_charges = gst_result["making_charges"]
        db_transaction.cgst_amount = gst_result["cgst_amount"]
        db_transaction.sgst_amount = gst_result["sgst_amount"]
        db_transaction.igst_amount = gst_result["igst_amount"]
        db_transaction.making_cgst = gst_result["making_cgst"]
        db_transaction.making_sgst = gst_result["making_sgst"]
        db_transaction.making_igst = gst_result["making_igst"]
        db_transaction.is_interstate = gst_result["is_interstate"]
        db_transaction.customer_gstin = getattr(gst_in, "customer_gstin", None)
        db_transaction.invoice_prefix = store.invoice_prefix if store else None
        db_transaction.invoice_sequence = seq if inv_number else None
        db_transaction.invoice_number = inv_number
        db.commit()
    # ── end GST block ───────────────────────────────────────────────────────

    record_piece_sale_events(
        db,
        db_transaction.id,
        store_id,
        db_transaction.products,
        db_transaction.customer_name,
        payload.get("user_id"),
    )
    customer = db.query(Customer).filter(Customer.id == db_transaction.customer_id).first()
    if customer:
        background_tasks.add_task(
            send_purchase_order_notifications,
            customer_email=customer.email or "",
            customer_phone=customer.primary_phone or "",
            customer_name=db_transaction.customer_name,
            transaction_id=db_transaction.id,
            date=db_transaction.date,
            products_list=db_transaction.products or [],
            grand_total=float(db_transaction.grand_total or 0),
            paid_amount=float(db_transaction.paid_amount or 0),
            due_amount=float(db_transaction.due_amount or 0),
            customer_id=customer.id,
        )
    log_activity(
        db,
        payload,
        action="created",
        entity_type="transaction",
        entity_id=str(db_transaction.id),
        message=f"Created bill #{db_transaction.id} for {db_transaction.customer_name} (₹{float(db_transaction.grand_total or 0):.2f})",
        store_id=store_id,
    )
    return {"message": "Transaction saved successfully", "transactionId": db_transaction.id}


@router.get("/{customer_id}", response_model=List[TransactionResponse])
def get_transaction(
    customer_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    role = payload.get("role", "staff")
    is_admin = (role == "admin")
    return get_transactions(db, customer_id=customer_id, store_id=store_id, is_admin=is_admin)


@router.put("/{transaction_id}")
def update_transactions(
    transaction_id: int,
    transaction: TransactionUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    t = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    store_id = payload.get("store_id")
    if store_id is not None and t.store_id != store_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this transaction")
    if store_id is None and t.store_id is not None:
        raise HTTPException(status_code=403, detail="Not authorized to update this transaction")
    updated = update_transaction(db, transaction_id, transaction)
    log_activity(
        db,
        payload,
        action="updated",
        entity_type="transaction",
        entity_id=str(transaction_id),
        message=f"Updated bill #{transaction_id} for {updated.customer_name}",
        store_id=t.store_id,
    )
    return updated


class RecordPaymentBody(BaseModel):
    amount: float
    payment_mode: Optional[str] = None


@router.post("/{transaction_id}/record-payment")
def record_payment(
    request: Request,
    transaction_id: int,
    body: RecordPaymentBody,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    idem_key = request.headers.get("Idempotency-Key")
    if idem_key and len(idem_key) <= 64:
        existing = (
            db.query(PaymentIdempotency)
            .filter(
                PaymentIdempotency.idempotency_key == idem_key,
                PaymentIdempotency.transaction_id == transaction_id,
                PaymentIdempotency.amount == body.amount,
            )
            .first()
        )
        if existing and existing.response_snapshot:
            return json.loads(existing.response_snapshot)
    t = _get_transaction_for_staff(transaction_id, db, payload)
    due = float(t.due_amount or 0)
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    if body.amount > due:
        raise HTTPException(status_code=400, detail=f"Amount cannot exceed due amount (₹{due:.2f})")
    paid_before = float(t.paid_amount or 0)
    t.paid_amount = paid_before + body.amount
    t.due_amount = due - body.amount
    if body.payment_mode:
        t.payment_mode = body.payment_mode
    store_id = payload.get("store_id")
    payment_row = Payment(
        transaction_id=t.id,
        store_id=store_id,
        amount=body.amount,
        payment_mode=body.payment_mode,
    )
    db.add(payment_row)
    db.commit()
    db.refresh(t)
    db.refresh(payment_row)
    log_activity(
        db,
        payload,
        action="payment_recorded",
        entity_type="transaction",
        entity_id=str(t.id),
        message=f"Recorded payment ₹{body.amount:.2f} on bill #{t.id} (due now ₹{float(t.due_amount or 0):.2f})",
        store_id=t.store_id,
    )
    response_body = {
        "message": "Payment recorded",
        "transactionId": t.id,
        "paymentId": payment_row.id,
        "paidAmount": t.paid_amount,
        "dueAmount": t.due_amount,
    }
    if idem_key and len(idem_key) <= 64:
        idem_row = PaymentIdempotency(
            idempotency_key=idem_key,
            transaction_id=t.id,
            amount=body.amount,
            response_snapshot=json.dumps(response_body),
        )
        db.add(idem_row)
        db.commit()
    return response_body


# @router.put("/transactions/{transaction_id}/fullypaid")
# def mark_fully_paid(transaction_id: int, db: Session = Depends(get_db)):
#     transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
#     if not transaction:
#         raise HTTPException(status_code=404, detail="Transaction not found")
    
#     transaction.due_amount = 0
#     transaction.status = "paid"  # Assuming your model has a 'status' field
#     db.commit()
#     db.refresh(transaction)
#     return transaction  