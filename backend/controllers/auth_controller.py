import secrets
import random
import string
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models.user_model import User
from models.customer_invite import CustomerInvite
from models.password_reset_token import PasswordResetToken
from utils.auth_utils import verify_password, create_access_token, hash_password
from utils.audit import log_audit


def login_user(email: str, password: str, db: Session):
    """
    Authenticate user. Returns one of:
      - {"token": str, "refresh_token": str, "requires_2fa": False}   ← normal
      - {"requires_2fa": True, "temp_token": str}                     ← 2FA enabled
    Existing users with two_fa_enabled=False see the SAME behaviour as before.
    """
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    # Legacy: if there's only one user total and no superadmin exists yet, promote to superadmin
    superadmin_count = db.query(User).filter(User.role == "superadmin").count()
    if superadmin_count == 0 and db.query(User).count() == 1:
        user.role = "superadmin"
        db.commit()
        db.refresh(user)
    actor = (user.name or "").strip() or (user.email or "").strip() or "User"
    log_audit(
        db, user.id, "login", "user", str(user.id),
        message=f"{actor} signed in",
        actor_name=actor[:200],
        store_id=user.store_id,
    )

    # ── 2FA branch ──────────────────────────────────────────────────────────
    if getattr(user, "two_fa_enabled", False):
        return _issue_2fa_challenge(user, db)

    # ── Normal login (no 2FA) — identical to original behaviour ────────────
    role = user.role or "staff"
    payload = {
        "sub": user.email,
        "user_id": user.id,
        "role": role,
        "customer_id": user.customer_id,
        "store_id": user.store_id,
        "is_active": user.is_active if user.is_active is not None else True,
    }
    return {
        "requires_2fa": False,
        "token": create_access_token(payload),
        "_user": user,   # used by the route to build refresh token
    }


def _normalize_phone(s: str) -> str:
    return "".join(c for c in s if c.isdigit()) if s else ""


def resolve_store_from_identifier(identifier: str, db: Session):
    from models.store import Store
    from sqlalchemy import func as sa_func
    if not identifier or not identifier.strip():
        return None
    raw = identifier.strip()
    # 1. Numeric → try by primary key first (fast index lookup)
    if raw.isdigit():
        store = db.query(Store).filter(Store.id == int(raw), Store.is_active == True).first()
        if store:
            return store.id
    # 2. Exact customer_code match (indexed column)
    store = db.query(Store).filter(Store.customer_code == raw, Store.is_active == True).first()
    if store:
        return store.id
    # 3. Phone — strip non-digits and compare via SQL LIKE to avoid full scan
    phone = _normalize_phone(raw)
    if phone:
        # Match last 10 digits via SQL rather than loading all stores into Python
        store = (
            db.query(Store)
            .filter(
                Store.contact_phone.isnot(None),
                Store.contact_phone.like(f"%{phone[-10:]}"),
                Store.is_active == True,
            )
            .first()
        )
        if store and _normalize_phone(store.contact_phone) == phone:
            return store.id
    return None


def _validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not any(c.isalpha() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one letter")
    if not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number")


def register_user(name: str, email: str, password: str, db: Session, store_id: int = None, company_identifier: str = None):
    from models.store import Store
    _validate_password_strength(password)
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
    _validate_password_strength(password)
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
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete(synchronize_session=False)
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)
    reset = PasswordResetToken(user_id=user.id, token=token, expires_at=expires_at)
    db.add(reset)
    db.query(PasswordResetToken).filter(PasswordResetToken.expires_at < datetime.utcnow()).delete(synchronize_session=False)
    db.commit()
    return {"message": "If an account exists with this email, a reset link has been sent."}


def reset_password(token: str, new_password: str, db: Session):
    _validate_password_strength(new_password)
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


# ─────────────────────────────────────────────────────────────────────────────
# 2-Factor Authentication helpers
# ─────────────────────────────────────────────────────────────────────────────

def _generate_otp() -> str:
    """Return a 6-digit numeric OTP string."""
    return "".join(random.choices(string.digits, k=6))


def _issue_2fa_challenge(user: User, db: Session) -> dict:
    """
    Generate an OTP + temp_token for the user, store in otp_tokens, return
    the pending dict. The OTP is printed to server log (replace with email in prod).
    """
    from models.otp_token import OtpToken
    from jose import jwt as jose_jwt
    from config.settings import SECRET_KEY, JWT_ALGORITHM

    # Clean up any old unused OTPs for this user
    db.query(OtpToken).filter(
        OtpToken.user_id == user.id,
        OtpToken.used_at.is_(None),
    ).delete(synchronize_session=False)

    otp_code = _generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # temp_token: minimal JWT, type=2fa_pending, expires in 10 min
    temp_payload = {
        "sub": user.email,
        "user_id": user.id,
        "type": "2fa_pending",
        "exp": expires_at,
    }
    temp_token = jose_jwt.encode(temp_payload, SECRET_KEY, algorithm=JWT_ALGORITHM)

    row = OtpToken(
        user_id=user.id,
        otp_code=otp_code,
        temp_token=temp_token,
        expires_at=expires_at,
    )
    db.add(row)
    db.commit()

    # TODO: replace with email send (SMTP/SendGrid) in production
    import logging
    logging.getLogger("app").warning(
        f"[2FA] OTP for {user.email}: {otp_code}  (expires in 10 min)"
    )

    return {"requires_2fa": True, "temp_token": temp_token}


def verify_2fa_otp(temp_token: str, otp_code: str, db: Session) -> dict:
    """
    Validate temp_token + otp_code. On success, return full access+refresh tokens.
    Raises 401 on any failure (wrong OTP, expired, already used).
    """
    from models.otp_token import OtpToken
    from jose import jwt as jose_jwt, JWTError
    from config.settings import SECRET_KEY, JWT_ALGORITHM
    from utils.auth_utils import create_access_token, create_refresh_token

    # Verify temp_token signature & expiry
    try:
        tp = jose_jwt.decode(temp_token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please log in again.")

    if tp.get("type") != "2fa_pending":
        raise HTTPException(status_code=401, detail="Invalid token type.")

    user_id = tp.get("user_id")

    # Find matching unused, unexpired OTP row
    row = db.query(OtpToken).filter(
        OtpToken.user_id == user_id,
        OtpToken.temp_token == temp_token,
        OtpToken.used_at.is_(None),
        OtpToken.expires_at > datetime.utcnow(),
    ).first()

    if not row:
        raise HTTPException(status_code=401, detail="OTP expired or already used. Please log in again.")

    if row.otp_code != otp_code.strip():
        raise HTTPException(status_code=401, detail="Incorrect OTP. Please try again.")

    # Mark used immediately (single-use)
    row.used_at = datetime.utcnow()
    db.commit()

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Account not found or inactive.")

    role = user.role or "staff"
    payload = {
        "sub": user.email,
        "user_id": user.id,
        "role": role,
        "customer_id": user.customer_id,
        "store_id": user.store_id,
        "is_active": user.is_active,
    }
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token({"sub": user.email, "user_id": user.id})
    return {"token": access_token, "refresh_token": refresh_token, "requires_2fa": False}


def toggle_2fa(user_id: int, enable: bool, db: Session) -> dict:
    """Enable or disable 2FA for a user. Returns updated status."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.two_fa_enabled = enable
    db.commit()
    return {"two_fa_enabled": enable, "message": f"2FA {'enabled' if enable else 'disabled'} successfully."}


# ─────────────────────────────────────────────────────────────────────────────
# Self-Registration — new shop owner creates account + store atomically
# ─────────────────────────────────────────────────────────────────────────────

def _generate_company_code(db: Session) -> str:
    """Generate a unique 6-char alphanumeric Company ID prefixed with JM-."""
    from models.store import Store
    chars = string.ascii_uppercase + string.digits
    for _ in range(20):  # retry up to 20 times
        code = "JM-" + "".join(random.choices(chars, k=6))
        if not db.query(Store).filter(Store.customer_code == code).first():
            return code
    raise RuntimeError("Could not generate unique company code")


def owner_register(
    name: str,
    email: str,
    password: str,
    store_name: str,
    db: Session,
    phone: str = None,
    city: str = None,
    gstin: str = None,
) -> dict:
    """
    Create a new Store + admin User atomically.
    Assigns a 14-day trial subscription.
    Returns full JWT tokens so the owner is logged in immediately.
    """
    from models.store import Store
    from utils.auth_utils import create_access_token, create_refresh_token
    from services.billing_service import assign_trial

    _validate_password_strength(password)

    # Email uniqueness
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="This email is already registered. Please sign in.")

    company_code = _generate_company_code(db)
    location_str = city or None

    # Create store
    store = Store(
        name=store_name.strip(),
        gstin=gstin or None,
        customer_code=company_code,
        contact_phone=phone or None,
        location=location_str,
        owner_name=name.strip(),
        owner_email=email.strip(),
        is_active=True,
        subscription_status="trial",
    )
    db.add(store)
    db.flush()  # get store.id without committing

    # Create admin user linked to new store
    new_user = User(
        name=name.strip(),
        email=email.strip(),
        hashed_password=hash_password(password),
        role="admin",
        store_id=store.id,
        phone=phone or None,
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    # Assign 14-day trial
    try:
        assign_trial(store, db)
    except Exception:
        pass  # trial assignment failure must not block registration

    db.commit()
    db.refresh(new_user)
    db.refresh(store)

    log_audit(
        db, new_user.id, "owner_register", "store", str(store.id),
        message=f"New store '{store_name}' registered by {email}",
        actor_name=name[:200],
        store_id=store.id,
    )

    payload = {
        "sub": new_user.email,
        "user_id": new_user.id,
        "role": "admin",
        "customer_id": None,
        "store_id": store.id,
        "is_active": True,
    }
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token({"sub": new_user.email, "user_id": new_user.id})

    return {
        "message": f"Welcome to Jewellery Manager, {name}! Your store has been created.",
        "token": access_token,
        "refresh_token": refresh_token,
        "store_id": store.id,
        "store_name": store.name,
        "company_code": company_code,
    }
