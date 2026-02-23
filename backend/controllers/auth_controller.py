from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models.user_model import User
from models.customer_invite import CustomerInvite
from utils.auth_utils import verify_password, create_access_token, hash_password
from utils.audit import log_audit


def login_user(email: str, password: str, db: Session):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    log_audit(db, user.id, "login", "user", str(user.id))
    payload = {
        "sub": user.email,
        "user_id": user.id,
        "role": user.role or "staff",
        "customer_id": user.customer_id,
        "store_id": user.store_id,
    }
    return create_access_token(payload)


def register_user(name: str, email: str, password: str, db: Session):
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = User(
        name=name,
        email=email,
        hashed_password=hash_password(password),
        role="staff",
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
