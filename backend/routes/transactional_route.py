from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
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
from pydantic import BaseModel
from utils.pdf_invoice import build_purchase_order_pdf
from services.notification import send_purchase_order_notifications
from typing import List, Optional

router = APIRouter(tags=["Transactions"])


def _get_transaction_for_staff(transaction_id: int, db: Session, payload: dict):
    t = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    store_id = payload.get("store_id")
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
            "rate": p.get("rate"),
            "makingCharge": p.get("makingCharge"),
            "diamondCharge": p.get("diamondCharge"),
            "gstPercent": p.get("gstPercent"),
            "total": p.get("total"),
        }
        for p in (t.products or [])
    ]
    store_name = None
    if t.store_id:
        store = db.query(Store).filter(Store.id == t.store_id).first()
        if store:
            store_name = store.name
    return {
        "transaction": {
            "id": t.id,
            "customerName": t.customer_name,
            "grandTotal": t.grand_total,
            "paidAmount": t.paid_amount,
            "dueAmount": t.due_amount,
            "date": t.date.isoformat() if t.date else None,
            "products": products,
        },
        "invoice": {"id": inv.id, "irn": inv.irn} if inv else None,
        "storeName": store_name,
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
    pdf_bytes = build_purchase_order_pdf(t, store_name=store_name)
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
    db_transaction = create_transaction(db, transaction, store_id=store_id)
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
        )
    return {"message": "Transaction saved successfully", "transactionId": db_transaction.id}


@router.get("/{customer_id}", response_model=List[TransactionResponse])
def get_transaction(
    customer_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    return get_transactions(db, customer_id=customer_id, store_id=store_id)


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
    return update_transaction(db, transaction_id, transaction)


class RecordPaymentBody(BaseModel):
    amount: float
    payment_mode: Optional[str] = None


@router.post("/{transaction_id}/record-payment")
def record_payment(
    transaction_id: int,
    body: RecordPaymentBody,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
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
    return {
        "message": "Payment recorded",
        "transactionId": t.id,
        "paymentId": payment_row.id,
        "paidAmount": t.paid_amount,
        "dueAmount": t.due_amount,
    }


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