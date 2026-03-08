from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from config.database import get_db
from dependencies import require_admin
from models.user_model import User
from models.store import Store
from schemas.user_schema import UserOut, AdminUserCreate, AdminUserUpdate
from schemas.store_schema import StoreResponse, StoreCreate, StoreUpdate
from utils.auth_utils import hash_password

router = APIRouter(tags=["Admin"])


@router.get("/users", response_model=List[UserOut])
def list_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    db: Session = Depends(get_db),
    _auth=Depends(require_admin),
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    return q.all()


@router.post("/users", response_model=UserOut)
def create_user(
    body: AdminUserCreate,
    db: Session = Depends(get_db),
    _auth=Depends(require_admin),
):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if body.role == "customer" and body.customer_id is None:
        raise HTTPException(
            status_code=400,
            detail="customer_id required when role is customer",
        )
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
    return new_user


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: AdminUserUpdate,
    db: Session = Depends(get_db),
    _auth=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.name is not None:
        user.name = body.name
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
    _auth=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    from models.audit_log import AuditLog
    db.query(AuditLog).filter(AuditLog.user_id == user_id).update({AuditLog.user_id: None})
    db.delete(user)
    db.commit()
    return None


@router.get("/stores", response_model=List[StoreResponse])
def list_stores_admin(
    db: Session = Depends(get_db),
    _auth=Depends(require_admin),
):
    return db.query(Store).all()


@router.post("/stores", response_model=StoreResponse)
def create_store_admin(
    body: StoreCreate,
    db: Session = Depends(get_db),
    _auth=Depends(require_admin),
):
    store = Store(
        name=body.name,
        gstin=body.gstin,
        bis_reg=body.bis_reg,
        join_date=body.join_date,
        address=body.address,
        location=body.location,
        contact_phone=body.contact_phone,
        is_active=body.is_active,
        license_type=body.license_type,
    )
    db.add(store)
    db.commit()
    db.refresh(store)
    store.customer_code = f"CUST-{store.id}"
    db.commit()
    db.refresh(store)
    return store


@router.put("/stores/{store_id}", response_model=StoreResponse)
def update_store_admin(
    store_id: int,
    body: StoreUpdate,
    db: Session = Depends(get_db),
    _auth=Depends(require_admin),
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    updates = body.model_dump(exclude_unset=True)
    updates.pop("customer_code", None)
    for key, value in updates.items():
        setattr(store, key, value)
    db.commit()
    db.refresh(store)
    return store


@router.delete("/stores/{store_id}", status_code=204)
def delete_store_admin(
    store_id: int,
    db: Session = Depends(get_db),
    _auth=Depends(require_admin),
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    db.delete(store)
    db.commit()
    return None
