import uuid
import math
from datetime import date
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

_GIRVI_PHOTO_DIR = Path(__file__).resolve().parent.parent / "uploads" / "girvi_photos"
_ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
_MAX_PHOTO_BYTES = 5 * 1024 * 1024  # 5 MB

from config.database import get_db
from dependencies import require_staff, require_manager
from core.db_filters import apply_store_filter, resolve_write_store_id
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
from utils.activity import log_activity

router = APIRouter(tags=["Girvi"])


def _months_elapsed(start: date, end: date) -> int:
    return (end.year - start.year) * 12 + (end.month - start.month)


@router.get("", response_model=list)
def list_loans(
    status: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(0, ge=0, description="1-based page. 0 = all (legacy)"),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(GirviLoan).join(Customer, GirviLoan.customer_id == Customer.id)
    q = apply_store_filter(q, GirviLoan, payload)
    if customer_id is not None:
        q = q.filter(GirviLoan.customer_id == customer_id)
    if status:
        q = q.filter(GirviLoan.status == status)
    if search:
        q = q.filter(Customer.name.ilike(f"%{search}%"))
    q = q.order_by(GirviLoan.created_at.desc())

    total = q.count()

    if page > 0:
        rows = q.offset((page - 1) * page_size).limit(page_size).all()
    else:
        rows = q.all()

    out = []
    for r in rows:
        d = GirviLoanResponse.model_validate(r)
        d.customer_name = r.customer.name
        d.photos = [GirviPhotoResponse.model_validate(p) for p in r.photos]
        out.append(d)

    if page > 0:
        serialised = [item.model_dump() for item in out]
        headers = {
            "X-Total-Count": str(total),
            "X-Page": str(page),
            "X-Page-Size": str(page_size),
            "X-Total-Pages": str(math.ceil(total / page_size) if total else 0),
            "Access-Control-Expose-Headers": "X-Total-Count, X-Page, X-Page-Size, X-Total-Pages",
        }
        return JSONResponse(content=serialised, headers=headers)

    return out


@router.post("", response_model=GirviLoanResponse, status_code=201)
def create_loan(
    data: GirviLoanCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = resolve_write_store_id(payload, db, getattr(data, 'store_id', None))
    customer = db.query(Customer).filter(
        Customer.id == data.customer_id,
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
    log_activity(db, payload, action="created", entity_type="girvi_loan",
                 entity_id=str(loan.id),
                 message=f"Created girvi loan #{loan.id} for customer #{data.customer_id} — ₹{data.principal_amount}",
                 store_id=store_id)
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


@router.get("/{loan_id}")
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
    payments = (
        db.query(GirviInterestPayment)
        .filter(GirviInterestPayment.loan_id == loan_id)
        .order_by(GirviInterestPayment.paid_at.desc())
        .all()
    )
    total_paid = sum(p.amount for p in payments)
    out = GirviLoanResponse.model_validate(loan)
    out.customer_name = loan.customer.name
    out.photos = [GirviPhotoResponse.model_validate(p) for p in loan.photos]
    out_dict = out.model_dump()
    out_dict["interest_payments"] = [
        {
            "id": p.id,
            "amount": float(p.amount),
            "for_month": str(p.for_month) if p.for_month else None,
            "notes": p.notes,
            "created_at": p.paid_at.isoformat() if p.paid_at else None,
        }
        for p in payments
    ]
    out_dict["total_interest_paid"] = float(total_paid)
    out_dict["customer_phone"] = loan.customer.primary_phone if loan.customer else None
    return out_dict


@router.patch("/{loan_id}", response_model=GirviLoanResponse)
def update_loan(
    loan_id: int,
    data: GirviLoanUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_manager),  # ⚠️ manager+ only — edit loan details
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
    log_activity(db, payload, action="updated", entity_type="girvi_loan",
                 entity_id=str(loan_id),
                 message=f"Updated girvi loan #{loan_id}")
    out = GirviLoanResponse.model_validate(loan)
    out.customer_name = loan.customer.name
    out.photos = [GirviPhotoResponse.model_validate(p) for p in loan.photos]
    return out


@router.post("/{loan_id}/close")
def close_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_manager),  # ⚠️ manager+ only — closing a loan is irreversible
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
    db.refresh(loan)
    log_activity(db, payload, action="closed", entity_type="girvi_loan",
                 entity_id=str(loan_id),
                 message=f"Closed girvi loan #{loan_id}")
    d = GirviLoanResponse.model_validate(loan)
    d.customer_name = loan.customer.name if loan.customer else None
    d.photos = [GirviPhotoResponse.model_validate(p) for p in loan.photos]
    return d


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
    from datetime import datetime
    for_month = data.for_month or datetime.utcnow().strftime("%Y-%m")
    payment = GirviInterestPayment(
        loan_id=loan_id,
        amount=data.amount,
        for_month=for_month,
        notes=data.notes,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment

@router.post("/{loan_id}/photo")
async def upload_girvi_photo(
    loan_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    """Upload a photo for a girvi loan (customer photo or item photo). Max 5 MB, JPEG/PNG/WebP."""
    loan = db.query(GirviLoan).filter(GirviLoan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    content_type = (file.content_type or "").split(";")[0].strip()
    ext = _ALLOWED_IMAGE_TYPES.get(content_type)
    if not ext:
        raise HTTPException(status_code=422, detail="Only JPEG, PNG, or WebP images are allowed")

    data = await file.read()
    if len(data) > _MAX_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 5 MB or smaller")

    _GIRVI_PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    fname = f"{uuid.uuid4().hex[:16]}{ext}"
    (_GIRVI_PHOTO_DIR / fname).write_bytes(data)
    image_url = f"/uploads/girvi_photos/{fname}"

    photo = GirviPhoto(loan_id=loan_id, image_url=image_url)
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return {"id": photo.id, "url": image_url}
