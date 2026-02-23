from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from dependencies import require_customer
from models.customer import Customer
from models.transactional import Transaction
from models.invoice import Invoice
from pydantic import BaseModel
from typing import Optional, Any, List

router = APIRouter(prefix="/api/customer-portal", tags=["Customer Portal"])


class ProfileResponse(BaseModel):
    id: int
    name: str
    email: Optional[str]
    primary_phone: str
    secondary_phone: Optional[str]
    address: Optional[str]
    city: Optional[str]
    pincode: Optional[str]
    preferences: Optional[Any]

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    secondary_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    preferences: Optional[Any] = None


class InvoiceSummary(BaseModel):
    id: int
    transaction_id: int
    irn: Optional[str]
    grand_total: Optional[float] = None
    date: Optional[str] = None

    class Config:
        from_attributes = True


class OrderSummary(BaseModel):
    id: int
    customer_name: str
    grand_total: float
    paid_amount: float
    due_amount: float
    date: Optional[str] = None
    products: Optional[List[Any]] = None

    class Config:
        from_attributes = True


@router.get("/profile", response_model=ProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    auth: dict = Depends(require_customer),
):
    customer_id = auth["customer_id"]
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Profile not found")
    return customer


@router.put("/profile", response_model=ProfileResponse)
def update_my_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_customer),
):
    customer_id = auth["customer_id"]
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Profile not found")
    if data.name is not None:
        customer.name = data.name
    if data.secondary_phone is not None:
        customer.secondary_phone = data.secondary_phone
    if data.address is not None:
        customer.address = data.address
    if data.city is not None:
        customer.city = data.city
    if data.pincode is not None:
        customer.pincode = data.pincode
    if data.preferences is not None:
        customer.preferences = data.preferences
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/invoices", response_model=List[InvoiceSummary])
def get_my_invoices(
    db: Session = Depends(get_db),
    auth: dict = Depends(require_customer),
):
    customer_id = auth["customer_id"]
    transactions = (
        db.query(Transaction)
        .filter(Transaction.customer_id == customer_id)
        .order_by(Transaction.date.desc())
        .all()
    )
    txn_ids = [t.id for t in transactions]
    invoices = (
        db.query(Invoice)
        .filter(Invoice.transaction_id.in_(txn_ids))
        .all()
    )
    txn_map = {t.id: t for t in transactions}
    result = []
    for inv in invoices:
        t = txn_map.get(inv.transaction_id)
        result.append(
            InvoiceSummary(
                id=inv.id,
                transaction_id=inv.transaction_id,
                irn=inv.irn,
                grand_total=t.grand_total if t else None,
                date=t.date.isoformat() if t and t.date else None,
            )
        )
    return result


@router.get("/invoices/{transaction_id}")
def get_my_invoice_by_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_customer),
):
    customer_id = auth["customer_id"]
    txn = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.customer_id == customer_id,
        )
        .first()
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv = db.query(Invoice).filter(Invoice.transaction_id == transaction_id).first()
    return {
        "transaction": {
            "id": txn.id,
            "customer_name": txn.customer_name,
            "grand_total": txn.grand_total,
            "paid_amount": txn.paid_amount,
            "due_amount": txn.due_amount,
            "date": txn.date.isoformat() if txn.date else None,
            "products": txn.products,
        },
        "invoice": {
            "id": inv.id,
            "irn": inv.irn,
            "einv_payload": inv.einv_payload,
        } if inv else None,
    }


@router.get("/orders", response_model=List[OrderSummary])
def get_my_orders(
    db: Session = Depends(get_db),
    auth: dict = Depends(require_customer),
):
    customer_id = auth["customer_id"]
    transactions = (
        db.query(Transaction)
        .filter(Transaction.customer_id == customer_id)
        .order_by(Transaction.date.desc())
        .all()
    )
    return [
        OrderSummary(
            id=t.id,
            customer_name=t.customer_name,
            grand_total=t.grand_total,
            paid_amount=t.paid_amount,
            due_amount=t.due_amount,
            date=t.date.isoformat() if t.date else None,
            products=t.products,
        )
        for t in transactions
    ]
