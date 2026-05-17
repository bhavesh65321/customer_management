from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from config.database import get_db
from dependencies import require_staff, require_manager
from models.user_model import User
from schemas.user_schema import UserOut, AdminUserUpdate, WorkerCreate
from utils.auth_utils import hash_password
from controllers.auth_controller import _validate_password_strength
from utils.activity import log_activity
from core.db_filters import resolve_write_store_id

router = APIRouter(tags=["Workers"])


@router.get("", response_model=List[UserOut])
def list_workers(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),    # staff can VIEW colleagues
):
    store_id = payload.get("store_id")
    role = payload.get("role", "staff")
    q = db.query(User).filter(User.role.in_(["staff", "manager"]))
    if store_id is not None:
        q = q.filter(User.store_id == store_id)
    elif role != "admin":
        return []  # misconfigured non-admin
    return q.all()


@router.post("", response_model=UserOut, status_code=201)
def add_worker(
    body: WorkerCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_manager),  # ⚠️ only manager+ can ADD workers
):
    store_id = resolve_write_store_id(payload, db)
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    _validate_password_strength(body.password)
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
    log_activity(db, payload, action="created", entity_type="worker",
                 entity_id=str(new_user.id),
                 message=f"Added worker {new_user.name} ({new_user.email})",
                 store_id=store_id)
    return new_user


@router.put("/{user_id}", response_model=UserOut)
def update_worker(
    user_id: int,
    body: AdminUserUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_manager),  # ⚠️ only manager+ can EDIT workers
):
    store_id = resolve_write_store_id(payload, db)
    user = db.query(User).filter(
        User.id == user_id,
        User.store_id == store_id,
        User.role.in_(["staff","manager"]),
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Worker not found")
    updates = body.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    log_activity(db, payload, action="updated", entity_type="worker",
                 entity_id=str(user_id),
                 message=f"Updated worker #{user_id}",
                 store_id=store_id)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_worker(
    user_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_manager),  # ⚠️ only manager+ can DELETE workers
):
    store_id = resolve_write_store_id(payload, db)
    user = db.query(User).filter(
        User.id == user_id,
        User.store_id == store_id,
        User.role.in_(["staff","manager"]),
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Worker not found")
    from models.audit_log import AuditLog
    db.query(AuditLog).filter(AuditLog.user_id == user_id).update({AuditLog.user_id: None})
    worker_name = user.name or user.email
    db.delete(user)
    db.commit()
    log_activity(db, payload, action="deleted", entity_type="worker",
                 entity_id=str(user_id),
                 message=f"Deleted worker {worker_name} (id={user_id})",
                 store_id=store_id)
    return None
