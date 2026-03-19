from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from config.database import get_db
from dependencies import require_staff
from core.db_filters import apply_store_filter
from models.girvi_loan import GirviLoan, GirviPhoto, GirviInterestPayment
from models.customer import Customer
from schemas.girvi_schema import (
    GirviLoanCreate,
    GirviLoanUpdate,
    GirviLoanResponse,
    GirviPhotoResponse,
    GirviInterestPaymentCreate,
    GirviInterestPaymentResponse,
    GirviInterestSummary,
)

router = APIRouter(tags=["Girvi"])


def _months_elapsed(start: date, end: date) -> int:
    return (end.year - start.year) * 12 + (end.month - start.month)


@router.get("", response_model=list)
def list_loans(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(GirviLoan).join(Customer, GirviLoan.customer_id == Customer.id)
    q = apply_store_filter(q, GirviLoan, payload)
    if status:
        q = q.filter(GirviLoan.status == status)
    q = q.order_by(GirviLoan.created_at.desc())
    rows = q.all()
    out = []
    for r in rows:
        d = GirviLoanResponse.model_validate(r)
        d.customer_name = r.customer.name
        d.photos = [GirviPhotoResponse.model_validate(p) for p in r.photos]
        out.append(d)
    return out


@router.post("", response_model=GirviLoanResponse)
def create_loan(
    data: GirviLoanCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    if store_id is None:
        raise HTTPException(status_code=403, detail="Store required")
    customer = db.query(Customer).filter(
        Customer.id == data.customer_id,
        Customer.store_id == store_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    loan = GirviLoan(
        store_id=store_id,
        customer_id=data.customer_id,
        jewelry_description=data.jewelry_description,
        gross_weight=data.gross_weight,
        purity=data.purity,
        principal_amount=data.principal_amount,
        interest_rate_per_month=data.interest_rate_per_month,
        start_date=data.start_date,
        status="active",
        notes=data.notes,
    )
    db.add(loan)
    db.flush()
    for url in data.photo_urls or []:
        db.add(GirviPhoto(loan_id=loan.id, image_url=url))
    db.commit()
    db.refresh(loan)
    out = GirviLoanResponse.model_validate(loan)
    out.customer_name = customer.name
    out.photos = [GirviPhotoResponse.model_validate(p) for p in loan.photos]
    return out


@router.get("/interest-due", response_model=list)
def list_interest_due(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(GirviLoan).filter(GirviLoan.status == "active")
    q = apply_store_filter(q, GirviLoan, payload)
    loans = q.all()
    today = date.today()
    result = []
    for loan in loans:
        paid = (
            db.query(func.coalesce(func.sum(GirviInterestPayment.amount), 0))
            .filter(GirviInterestPayment.loan_id == loan.id)
            .scalar()
        ) or 0
        months = _months_elapsed(loan.start_date, today)
        total_due = loan.principal_amount * (loan.interest_rate_per_month / 100) * months
        outstanding = max(0, total_due - paid)
        result.append(GirviInterestSummary(
            loan_id=loan.id,
            principal=loan.principal_amount,
            rate_per_month=loan.interest_rate_per_month,
            months_elapsed=months,
            total_interest_due=round(total_due, 2),
            total_interest_paid=round(paid, 2),
            interest_outstanding=round(outstanding, 2),
        ))
    return result


@router.get("/{loan_id}", response_model=GirviLoanResponse)
def get_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    loan = db.query(GirviLoan).filter(GirviLoan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    q = db.query(GirviLoan).filter(GirviLoan.id == loan_id)
    q = apply_store_filter(q, GirviLoan, payload)
    if not q.first():
        raise HTTPException(status_code=404, detail="Loan not found")
    db.refresh(loan)
    out = GirviLoanResponse.model_validate(loan)
    out.customer_name = loan.customer.name
    out.photos = [GirviPhotoResponse.model_validate(p) for p in loan.photos]
    return out


@router.patch("/{loan_id}", response_model=GirviLoanResponse)
def update_loan(
    loan_id: int,
    data: GirviLoanUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    loan = db.query(GirviLoan).filter(GirviLoan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    q = db.query(GirviLoan).filter(GirviLoan.id == loan_id)
    q = apply_store_filter(q, GirviLoan, payload)
    if not q.first():
        raise HTTPException(status_code=404, detail="Loan not found")
    if data.jewelry_description is not None:
        loan.jewelry_description = data.jewelry_description
    if data.gross_weight is not None:
        loan.gross_weight = data.gross_weight
    if data.purity is not None:
        loan.purity = data.purity
    if data.notes is not None:
        loan.notes = data.notes
    db.commit()
    db.refresh(loan)
    out = GirviLoanResponse.model_validate(loan)
    out.customer_name = loan.customer.name
    out.photos = [GirviPhotoResponse.model_validate(p) for p in loan.photos]
    return out


@router.post("/{loan_id}/close")
def close_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    from datetime import datetime
    loan = db.query(GirviLoan).filter(GirviLoan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    q = db.query(GirviLoan).filter(GirviLoan.id == loan_id)
    q = apply_store_filter(q, GirviLoan, payload)
    if not q.first():
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status != "active":
        raise HTTPException(status_code=400, detail="Loan is not active")
    loan.status = "closed"
    loan.closed_at = datetime.utcnow()
    db.commit()
    return {"message": "Loan closed"}


@router.post("/{loan_id}/interest", response_model=GirviInterestPaymentResponse)
def record_interest(
    loan_id: int,
    data: GirviInterestPaymentCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    loan = db.query(GirviLoan).filter(GirviLoan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    q = db.query(GirviLoan).filter(GirviLoan.id == loan_id)
    q = apply_store_filter(q, GirviLoan, payload)
    if not q.first():
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status != "active":
        raise HTTPException(status_code=400, detail="Loan is not active")
    payment = GirviInterestPayment(
        loan_id=loan_id,
        amount=data.amount,
        for_month=data.for_month,
        notes=data.notes,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment
