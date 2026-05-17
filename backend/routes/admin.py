import re
import secrets
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from config.database import get_db
from dependencies import require_superadmin, require_admin, require_manager, require_staff
from models.user_model import User
from models.store import Store
from models.customer import Customer
from models.transactional import Transaction
from models.payment import Payment
from schemas.user_schema import UserOut, AdminUserCreate, AdminUserUpdate
from schemas.store_schema import (
    StoreResponse,
    StoreDetailResponse,
    StoreCreate,
    StoreUpdate,
    StoreCodeAssign,
    StoreOnboardRequest,
    StoreOnboardResponse,
)
from utils.auth_utils import hash_password
from controllers.auth_controller import _validate_password_strength
from utils.activity import log_activity

router = APIRouter(tags=["Admin"])

_STORE_LOGO_DIR = Path(__file__).resolve().parent.parent / "uploads" / "store_logos"
_STORE_LOGO_DIR.mkdir(parents=True, exist_ok=True)
_MAX_LOGO_BYTES = 2 * 1024 * 1024
_LOGO_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

_STORE_CODE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9\-]{1,48}[A-Za-z0-9]$")


def _generate_store_code(name: str, db: Session) -> str:
    """
    Generate a unique, human-readable store code.
    Pattern: <NAME_PREFIX>-<6 random uppercase chars>
    e.g.  "Gold Palace Jewellers" → "GOLDPALA-X7K2MQ"
    Retries up to 10 times to guarantee uniqueness.
    """
    prefix = re.sub(r"[^A-Za-z0-9]", "", name).upper()[:8] or "STORE"
    for _ in range(10):
        suffix = secrets.token_hex(3).upper()          # 6 hex chars
        code = f"{prefix}-{suffix}"
        if not db.query(Store).filter(Store.customer_code == code).first():
            return code
    # Extreme fallback — full random
    return secrets.token_urlsafe(8).upper()


def _delete_store_logo_file(logo_url: Optional[str]) -> None:
    if not logo_url or "/store_logos/" not in logo_url:
        return
    name = Path(logo_url).name
    if not name or ".." in name or "/" in name:
        return
    path = _STORE_LOGO_DIR / name
    try:
        if path.is_file() and path.resolve().parent == _STORE_LOGO_DIR.resolve():
            path.unlink()
    except OSError:
        pass


@router.get("/users", response_model=List[UserOut])
def list_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    return q.all()


@router.post("/users", response_model=UserOut)
def create_user(
    body: AdminUserCreate,
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if body.role in ("staff", "manager") and body.store_id is None:
        raise HTTPException(
            status_code=400,
            detail="store_id is required when creating a staff or manager user. "
                   "Find the store ID via GET /api/admin/stores.",
        )
    if body.role == "customer" and body.customer_id is None:
        raise HTTPException(
            status_code=400,
            detail="customer_id required when role is customer",
        )
    if body.role == "customer":
        customer = db.query(Customer).filter(Customer.id == body.customer_id).first()
        if not customer:
            raise HTTPException(status_code=400, detail="Customer not found")
        if db.query(User).filter(User.customer_id == body.customer_id).first():
            raise HTTPException(status_code=400, detail="This customer already has an account")
    _validate_password_strength(body.password)
    new_user = User(
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=body.role,
        store_id=body.store_id,
        customer_id=body.customer_id,
        designation=body.designation,
        phone=body.phone,
        address=body.address,
        monthly_pay=body.monthly_pay,
        join_date=body.join_date,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    log_activity(
        db=db,
        payload=_auth,
        action="created",
        entity_type="user",
        entity_id=str(new_user.id),
        message=f"User '{new_user.name}' ({new_user.role}) created by admin",
        store_id=new_user.store_id,
    )
    return new_user


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: AdminUserUpdate,
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.name is not None:
        user.name = body.name
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.designation is not None:
        user.designation = body.designation
    if body.phone is not None:
        user.phone = body.phone
    if body.address is not None:
        user.address = body.address
    if body.monthly_pay is not None:
        user.monthly_pay = body.monthly_pay
    if body.join_date is not None:
        user.join_date = body.join_date
    if body.store_id is not None:
        user.store_id = body.store_id
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "superadmin":
        sa_count = db.query(User).filter(User.role == "superadmin").count()
        if sa_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last platform admin")
    from models.audit_log import AuditLog
    db.query(AuditLog).filter(AuditLog.user_id == user_id).update({AuditLog.user_id: None})
    db.delete(user)
    db.commit()
    log_activity(
        db=db,
        payload=_auth,
        action="deleted",
        entity_type="user",
        entity_id=str(user_id),
        message=f"User '{user.name}' ({user.role}) deleted by admin",
        store_id=user.store_id,
    )
    return None


@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    """
    KPI summary for the admin dashboard:
    total stores, active/inactive, by license type, expiring within 30 days, total revenue.
    """
    from datetime import date, timedelta
    all_stores = db.query(Store).all()
    today = date.today()
    in_30_days = today + timedelta(days=30)

    total = len(all_stores)
    active = sum(1 for s in all_stores if s.is_active)
    inactive = total - active
    expiring_soon = sum(
        1 for s in all_stores
        if s.is_active and s.license_expiry and today <= s.license_expiry <= in_30_days
    )
    expired = sum(
        1 for s in all_stores
        if s.license_expiry and s.license_expiry < today
    )

    by_license = {}
    for s in all_stores:
        key = s.license_type or "none"
        by_license[key] = by_license.get(key, 0) + 1

    # Total revenue across all stores
    total_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).scalar() or 0.0

    return {
        "total": total,
        "active": active,
        "inactive": inactive,
        "expiring_soon": expiring_soon,
        "expired": expired,
        "by_license_type": by_license,
        "total_revenue": float(total_revenue),
    }


@router.get("/stores/{store_id}/revenue")
def get_store_revenue(
    store_id: int,
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    """Per-store revenue breakdown: total, by payment mode, recent payments."""
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    payments = db.query(Payment).filter(Payment.store_id == store_id).all()
    total = sum(p.amount for p in payments)
    by_mode: dict = {}
    for p in payments:
        mode = p.payment_mode or "unknown"
        by_mode[mode] = by_mode.get(mode, 0) + p.amount

    # Per-store payment count and customer count
    customer_count = db.query(func.count(Customer.id)).filter(Customer.store_id == store_id).scalar() or 0
    txn_count = db.query(func.count(Transaction.id)).filter(Transaction.store_id == store_id).scalar() or 0

    recent = sorted(payments, key=lambda p: p.created_at, reverse=True)[:10]

    return {
        "store_id": store_id,
        "store_name": store.name,
        "total_revenue": float(total),
        "payment_count": len(payments),
        "customer_count": customer_count,
        "transaction_count": txn_count,
        "by_payment_mode": {k: float(v) for k, v in by_mode.items()},
        "recent_payments": [
            {
                "id": p.id,
                "amount": p.amount,
                "payment_mode": p.payment_mode,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in recent
        ],
    }


@router.get("/stores")
def list_stores_admin(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    """List all stores with per-store revenue. Admin sees every store."""
    q = db.query(Store)
    if is_active is not None:
        q = q.filter(Store.is_active == is_active)
    stores = q.order_by(Store.name).offset(skip).limit(limit).all()

    # Revenue per store in a single query
    rev_rows = (
        db.query(Payment.store_id, func.coalesce(func.sum(Payment.amount), 0))
        .group_by(Payment.store_id)
        .all()
    )
    rev_map = {row[0]: float(row[1]) for row in rev_rows}

    result = []
    for s in stores:
        d = {
            "id": s.id,
            "name": s.name,
            "gstin": s.gstin,
            "bis_reg": s.bis_reg,
            "company_id": s.customer_code,
            "join_date": s.join_date.isoformat() if s.join_date else None,
            "license_expiry": s.license_expiry.isoformat() if s.license_expiry else None,
            "address": s.address,
            "location": s.location,
            "contact_phone": s.contact_phone,
            "is_active": s.is_active,
            "license_type": s.license_type,
            "logo_url": s.logo_url,
            "owner_name": s.owner_name,
            "owner_email": s.owner_email,
            "revenue": rev_map.get(s.id, 0.0),
        }
        result.append(d)
    return result



@router.get("/stores/{store_id}", response_model=StoreDetailResponse)
def get_store_admin(
    store_id: int,
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    """Get full details for one store including all its users."""
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


@router.get("/stores/{store_id}/users", response_model=List[UserOut])
def list_store_users_admin(
    store_id: int,
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    """List all users belonging to a specific store."""
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return db.query(User).filter(User.store_id == store_id).order_by(User.name).all()


@router.post("/stores", response_model=StoreResponse)
def create_store_admin(
    body: StoreCreate,
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    """Create a new store. A unique Company ID is auto-generated (or use the custom one you provide)."""
    name_stripped = (body.name or "").strip()
    if name_stripped and db.query(Store).filter(func.lower(Store.name) == name_stripped.lower()).first():
        raise HTTPException(status_code=400, detail="A store with this name already exists")
    phone_stripped = (body.contact_phone or "").strip()
    if phone_stripped:
        if db.query(Store).filter(Store.contact_phone == phone_stripped).first():
            raise HTTPException(status_code=400, detail="A store with this contact phone already exists")
    # Validate / resolve Company ID
    custom_code = (body.company_id or "").strip().upper() if body.company_id else None
    if custom_code:
        if not _STORE_CODE_RE.match(custom_code):
            raise HTTPException(status_code=400, detail="Company ID must be 3–50 chars, letters/digits/hyphens only, no leading or trailing hyphen")
        if db.query(Store).filter(Store.customer_code == custom_code).first():
            raise HTTPException(status_code=400, detail=f"Company ID '{custom_code}' is already taken")

    store = Store(
        name=body.name,
        gstin=body.gstin,
        bis_reg=body.bis_reg,
        join_date=body.join_date,
        license_expiry=body.license_expiry,
        address=body.address,
        location=body.location,
        contact_phone=body.contact_phone,
        is_active=body.is_active,
        license_type=body.license_type,
        owner_name=body.owner_name,
        owner_email=body.owner_email,
    )
    db.add(store)
    db.flush()   # get store.id before commit

    store.customer_code = custom_code if custom_code else _generate_store_code(body.name, db)
    db.commit()
    db.refresh(store)
    log_activity(
        db=db,
        payload=_auth,
        action="created",
        entity_type="store",
        entity_id=str(store.id),
        message=f"Store '{store.name}' created with Company ID '{store.customer_code}'",
        store_id=store.id,
    )
    return store


# ---------------------------------------------------------------------------
# Store onboarding — create store + optional manager account in one call
# ---------------------------------------------------------------------------

@router.post("/stores/onboard", response_model=StoreOnboardResponse)
def onboard_store(
    body: StoreOnboardRequest,
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    """
    Full store onboarding in a single API call:
      1. Creates the store with a unique store code.
      2. Optionally creates a manager/owner user account linked to the store.
      3. Returns the store code — admin shares this with staff for self-registration.
    """
    # --- create store (reuse existing validation logic) ---
    name_stripped = (body.store.name or "").strip()
    if db.query(Store).filter(func.lower(Store.name) == name_stripped.lower()).first():
        raise HTTPException(status_code=400, detail="A store with this name already exists")
    phone_stripped = (body.store.contact_phone or "").strip()
    if phone_stripped and db.query(Store).filter(Store.contact_phone == phone_stripped).first():
        raise HTTPException(status_code=400, detail="A store with this contact phone already exists")

    custom_code = (body.store.company_id or "").strip().upper() if body.store.company_id else None
    if custom_code:
        if not _STORE_CODE_RE.match(custom_code):
            raise HTTPException(status_code=400, detail="Company ID must be 3–50 chars, letters/digits/hyphens only")
        if db.query(Store).filter(Store.customer_code == custom_code).first():
            raise HTTPException(status_code=400, detail=f"Company ID '{custom_code}' is already taken")

    store = Store(
        name=body.store.name,
        gstin=body.store.gstin,
        bis_reg=body.store.bis_reg,
        join_date=body.store.join_date,
        license_expiry=body.store.license_expiry,
        address=body.store.address,
        location=body.store.location,
        contact_phone=body.store.contact_phone,
        is_active=body.store.is_active,
        license_type=body.store.license_type,
        owner_name=body.store.owner_name,
        owner_email=body.store.owner_email,
    )
    db.add(store)
    db.flush()

    store.customer_code = custom_code if custom_code else _generate_store_code(body.store.name, db)
    db.flush()

    # --- optionally create manager/owner account ---
    manager_created = False
    manager_email = None
    if body.manager:
        if db.query(User).filter(User.email == body.manager.email).first():
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Email '{body.manager.email}' is already registered")
        _validate_password_strength(body.manager.password)
        mgr = User(
            name=body.manager.name,
            email=body.manager.email,
            hashed_password=hash_password(body.manager.password),
            role=body.manager.role,
            store_id=store.id,
            designation=body.manager.designation,
            phone=body.manager.phone,
            is_active=True,
        )
        db.add(mgr)
        manager_created = True
        manager_email = body.manager.email

    db.commit()
    db.refresh(store)

    log_activity(
        db=db,
        payload=_auth,
        action="onboarded",
        entity_type="store",
        entity_id=str(store.id),
        message=f"Store '{store.name}' onboarded with Company ID '{store.customer_code}'" +
                (f"; manager '{manager_email}' created" if manager_created else ""),
        store_id=store.id,
    )

    return StoreOnboardResponse(
        store=store,
        company_id=store.customer_code,
        manager_created=manager_created,
        manager_email=manager_email,
        message=(
            f"Store '{store.name}' onboarded successfully. "
            f"Share Company ID '{store.customer_code}' with staff for self-registration."
        ),
    )


# ---------------------------------------------------------------------------
# Company ID management
# ---------------------------------------------------------------------------

@router.patch("/stores/{store_id}/assign-code", response_model=StoreResponse)
def assign_store_code(
    store_id: int,
    body: StoreCodeAssign,
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    """
    Assign a custom Company ID to an existing store.
    Share this ID with staff/managers so they can self-register under this store.
    """
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    new_code = body.code.strip().upper()
    if not _STORE_CODE_RE.match(new_code):
        raise HTTPException(status_code=400, detail="Company ID must be 3–50 chars, letters/digits/hyphens only, no leading or trailing hyphen")
    conflict = db.query(Store).filter(Store.customer_code == new_code, Store.id != store_id).first()
    if conflict:
        raise HTTPException(status_code=400, detail=f"Company ID '{new_code}' is already assigned to another store")
    store.customer_code = new_code
    db.commit()
    db.refresh(store)
    return store


@router.post("/stores/{store_id}/regenerate-code", response_model=StoreResponse)
def regenerate_store_code(
    store_id: int,
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    """
    Generate a fresh unique Company ID (use if the old ID was leaked or compromised).
    The old ID is immediately invalidated — new staff must use the new ID to register.
    """
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    store.customer_code = _generate_store_code(store.name, db)
    db.commit()
    db.refresh(store)
    return store


@router.put("/stores/{store_id}", response_model=StoreResponse)
def update_store_admin(
    store_id: int,
    body: StoreUpdate,
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    updates = body.model_dump(exclude_unset=True)
    updates.pop("customer_code", None)   # code is managed via /assign-code / /regenerate-code
    for key, value in updates.items():
        setattr(store, key, value)
    db.commit()
    db.refresh(store)
    return store


@router.delete("/stores/{store_id}", status_code=204)
def delete_store_admin(
    store_id: int,
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    if db.query(Transaction).filter(Transaction.store_id == store_id).limit(1).first():
        raise HTTPException(
            status_code=400,
            detail="Store has transactions; delete or reassign them first",
        )
    if db.query(Customer).filter(Customer.store_id == store_id).limit(1).first():
        raise HTTPException(
            status_code=400,
            detail="Store has customers; delete or reassign them first",
        )
    if db.query(User).filter(User.store_id == store_id).limit(1).first():
        raise HTTPException(
            status_code=400,
            detail="Store has users; reassign or remove them first",
        )
    _delete_store_logo_file(store.logo_url)
    db.delete(store)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Audit log viewer — GET /api/admin/logs  (BE-02 enhanced)
# ---------------------------------------------------------------------------

@router.get("/logs")
def get_audit_logs(
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Filter by actor name or message text"),
    from_date: Optional[str] = Query(None, description="ISO date e.g. 2024-01-01"),
    to_date: Optional[str] = Query(None, description="ISO date e.g. 2024-12-31"),
    # Pagination
    page: int = Query(1, ge=1, description="1-based page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_superadmin),
):
    """
    Paginated audit log viewer (BE-02).
    - Admins see all stores.
    - Managers/staff see only their own store's logs.
    - Returns X-Total-Count, X-Total-Pages headers.
    """
    from models.audit_log import AuditLog
    from datetime import datetime
    from math import ceil as _ceil
    from fastapi.responses import JSONResponse as _JSONResponse
    from sqlalchemy import or_ as _or

    q = db.query(AuditLog)

    # Store isolation: managers only see their store
    if payload.get("role") != "admin":
        store_id = payload.get("store_id")
        if store_id is None:
            raise HTTPException(status_code=403, detail="Store required")
        q = q.filter(AuditLog.store_id == store_id)

    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if action:
        q = q.filter(AuditLog.action == action)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(
            _or(
                AuditLog.actor_name.ilike(term),
                AuditLog.message.ilike(term),
                AuditLog.entity_id.ilike(term),
            )
        )
    if from_date:
        q = q.filter(AuditLog.created_at >= datetime.fromisoformat(from_date))
    if to_date:
        q = q.filter(AuditLog.created_at <= datetime.fromisoformat(to_date + "T23:59:59"))

    total = q.count()
    logs = (
        q.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        {
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "message": log.message,
            "actor_name": log.actor_name,
            "store_id": log.store_id,
            "user_id": log.user_id,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]

    headers = {
        "X-Total-Count": str(total),
        "X-Page": str(page),
        "X-Page-Size": str(page_size),
        "X-Total-Pages": str(_ceil(total / page_size) if total else 0),
        "Access-Control-Expose-Headers": "X-Total-Count, X-Page, X-Page-Size, X-Total-Pages",
    }
    return _JSONResponse(content=items, headers=headers)


@router.post("/stores/{store_id}/logo", response_model=StoreResponse)
async def upload_store_logo_admin(
    store_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    ext = _LOGO_CONTENT_TYPES.get(content_type)
    if not ext:
        raise HTTPException(
            status_code=400,
            detail="Invalid image type. Use JPEG, PNG, WebP, or GIF.",
        )
    data = await file.read()
    if len(data) > _MAX_LOGO_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 2 MB or smaller")
    fname = f"{store_id}_{uuid.uuid4().hex[:12]}{ext}"
    path = _STORE_LOGO_DIR / fname
    path.write_bytes(data)
    _delete_store_logo_file(store.logo_url)
    store.logo_url = f"/uploads/store_logos/{fname}"
    db.commit()
    db.refresh(store)
    return store


@router.delete("/stores/{store_id}/logo", response_model=StoreResponse)
def delete_store_logo_admin(
    store_id: int,
    db: Session = Depends(get_db),
    _auth=Depends(require_superadmin),
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    _delete_store_logo_file(store.logo_url)
    store.logo_url = None
    db.commit()
    db.refresh(store)
    return store


# ── GTM-04: In-app Feedback endpoint ─────────────────────────────────────────
class FeedbackIn(BaseModel):
    type: str = "suggestion"  # suggestion | bug | praise
    message: str


@router.post("/feedback", status_code=201)
def submit_feedback(
    data: FeedbackIn,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    """GTM-04: Accept in-app feedback from authenticated users. Stored in audit log."""
    from utils.activity import log_activity
    log_activity(
        db,
        payload,
        action="feedback",
        entity_type=data.type,
        entity_id=None,
        message=data.message[:1000],
        store_id=payload.get("store_id"),
    )
    return {"message": "Thank you for your feedback!"}
