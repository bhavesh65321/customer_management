import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models.user_model import User
from models.customer_invite import CustomerInvite
from models.password_reset_token import PasswordResetToken
from utils.auth_utils import verify_password, create_access_token, hash_password
from utils.audit import log_audit


def login_user(email: str, password: str, db: Session):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    admin_count = db.query(User).filter(User.role == "admin").count()
    if admin_count == 0 and db.query(User).count() == 1:
        user.role = "admin"
        db.commit()
        db.refresh(user)
    log_audit(db, user.id, "login", "user", str(user.id))
    role = user.role or "staff"
    payload = {
        "sub": user.email,
        "user_id": user.id,
        "role": role,
        "customer_id": user.customer_id,
        "store_id": user.store_id,
    }
    return create_access_token(payload)


def _normalize_phone(s: str) -> str:
    return "".join(c for c in s if c.isdigit()) if s else ""


def resolve_store_from_identifier(identifier: str, db: Session):
    from models.store import Store
    if not identifier or not identifier.strip():
        return None
    raw = identifier.strip()
    if raw.isdigit():
        store = db.query(Store).filter(Store.id == int(raw), Store.is_active == True).first()
        if store:
            return store.id
    store = db.query(Store).filter(Store.customer_code == raw, Store.is_active == True).first()
    if store:
        return store.id
    phone = _normalize_phone(raw)
    if phone:
        store = db.query(Store).filter(Store.contact_phone.isnot(None)).all()
        for s in store:
            if _normalize_phone(s.contact_phone) == phone and s.is_active:
                return s.id
    return None


def register_user(name: str, email: str, password: str, db: Session, store_id: int = None, company_identifier: str = None):
    from models.store import Store
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    if store_id is None and company_identifier:
        store_id = resolve_store_from_identifier(company_identifier, db)
        if store_id is None:
            raise HTTPException(status_code=400, detail="Company not found or inactive. Check Company ID, Customer ID, or phone.")
    if store_id is not None:
        store = db.query(Store).filter(Store.id == store_id, Store.is_active == True).first()
        if not store:
            raise HTTPException(status_code=400, detail="Company not found or inactive")
    is_first_user = db.query(User).count() == 0
    role = "admin" if is_first_user else "staff"
    new_user = User(
        name=name,
        email=email,
        hashed_password=hash_password(password),
        role=role,
        store_id=store_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def customer_register_with_invite(
    token: str, email: str, password: str, db: Session
) -> User:
    invite = (
        db.query(CustomerInvite)
        .filter(
            CustomerInvite.token == token,
            CustomerInvite.used_at.is_(None),
            CustomerInvite.expires_at > datetime.utcnow(),
        )
        .first()
    )
    if not invite:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired invite token",
        )
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.customer_id == invite.customer_id).first():
        raise HTTPException(
            status_code=400,
            detail="This customer already has an account",
        )
    new_user = User(
        name=None,
        email=email,
        hashed_password=hash_password(password),
        role="customer",
        customer_id=invite.customer_id,
    )
    db.add(new_user)
    invite.used_at = datetime.utcnow()
    db.commit()
    db.refresh(new_user)
    return new_user


def forgot_password(email: str, db: Session):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"message": "If an account exists with this email, a reset link has been sent."}
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)
    reset = PasswordResetToken(user_id=user.id, token=token, expires_at=expires_at)
    db.add(reset)
    db.commit()
    return {
        "message": "If an account exists with this email, a reset link has been sent.",
        "reset_token": token,
        "reset_link": f"/reset-password?token={token}",
    }


def reset_password(token: str, new_password: str, db: Session):
    row = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.expires_at > datetime.utcnow(),
    ).first()
    if not row:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset link. Please request a new one.",
        )
    user = db.query(User).filter(User.id == row.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found.")
    user.hashed_password = hash_password(new_password)
    db.delete(row)
    db.commit()
