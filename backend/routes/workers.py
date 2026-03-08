from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from config.database import get_db
from dependencies import require_staff
from models.user_model import User
from schemas.user_schema import UserOut, AdminUserUpdate, WorkerCreate
from utils.auth_utils import hash_password

router = APIRouter(tags=["Workers"])


@router.get("", response_model=List[UserOut])
def list_workers(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    if store_id is None:
        return []
    return db.query(User).filter(
        User.role == "staff",
        User.store_id == store_id,
    ).all()


@router.post("", response_model=UserOut)
def add_worker(
    body: WorkerCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    if store_id is None:
        raise HTTPException(status_code=403, detail="No company linked to your account")
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = User(
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        role="staff",
        store_id=store_id,
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


@router.put("/{user_id}", response_model=UserOut)
def update_worker(
    user_id: int,
    body: AdminUserUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    if store_id is None:
        raise HTTPException(status_code=403, detail="No company linked to your account")
    user = db.query(User).filter(
        User.id == user_id,
        User.store_id == store_id,
        User.role == "staff",
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Worker not found")
    updates = body.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_worker(
    user_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    if store_id is None:
        raise HTTPException(status_code=403, detail="No company linked to your account")
    user = db.query(User).filter(
        User.id == user_id,
        User.store_id == store_id,
        User.role == "staff",
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Worker not found")
    from models.audit_log import AuditLog
    db.query(AuditLog).filter(AuditLog.user_id == user_id).update({AuditLog.user_id: None})
    db.delete(user)
    db.commit()
    return None
