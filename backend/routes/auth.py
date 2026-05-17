from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from schemas.user_schema import (
    UserRegister,
    UserCreate,
    UserLogin,
    CustomerRegisterWithInvite,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserOut,
    UserProfileUpdate,
    TokenRefreshRequest,
    TokenResponse,
    OwnerRegisterRequest,
    TwoFAVerifyRequest,
    TwoFAToggleRequest,
)
from config.database import get_db
from controllers.auth_controller import (
    register_user,
    login_user,
    customer_register_with_invite,
    forgot_password,
    reset_password,
    verify_2fa_otp,
    toggle_2fa,
    owner_register,
)
from models.store import Store
from dependencies import get_token_payload
from utils.logger import log_app_event
from middleware.rate_limit_middleware import limiter

router = APIRouter()


@router.get("/companies")
def list_companies_for_registration(db: Session = Depends(get_db)):
    stores = db.query(Store).filter(Store.is_active == True).order_by(Store.name).all()
    return [{"id": s.id, "name": s.name} for s in stores]


@router.get("/store-lookup")
def store_lookup(identifier: str, db: Session = Depends(get_db)):
    """
    Given a Company ID, store numeric ID, or contact phone number, return
    the store's owner_name, owner_email, and contact_phone so the
    registration form can auto-populate those fields.
    Returns 404 if no matching active store is found.
    """
    from controllers.auth_controller import resolve_store_from_identifier
    store_id = resolve_store_from_identifier(identifier.strip(), db)
    if store_id is None:
        raise HTTPException(status_code=404, detail="No active store found for this identifier")
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return {
        "store_id": store.id,
        "store_name": store.name,
        "owner_name": store.owner_name or "",
        "owner_email": store.owner_email or "",
        "contact_phone": store.contact_phone or "",
    }


@router.post("/register")
@limiter.limit("10/minute")
def register(request: Request, user: UserRegister, db: Session = Depends(get_db)):
    try:
        register_user(
            user.name,
            user.email,
            user.password,
            db,
            store_id=user.store_id,
            company_identifier=user.company_identifier,
        )
        return {"message": "User registered successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Registration failed. Please try again.",
        )


@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, user: UserLogin, db: Session = Depends(get_db)):
    from utils.rate_limit import is_rate_limited, record_attempt
    from utils.auth_utils import create_refresh_token
    from models.user_model import User as UserModel
    client_ip = request.client.host if request.client else "unknown"
    key = f"login:{client_ip}"
    if is_rate_limited(key):
        raise HTTPException(status_code=429, detail="Too many login attempts; try again later")
    record_attempt(key)
    try:
        result = login_user(user.email, user.password, db)
    except HTTPException as exc:
        log_app_event("warning", "login_failed", email=user.email, ip=client_ip, reason=exc.detail)
        raise

    # ── 2FA pending: return minimal response, no full token yet ────────────
    if result.get("requires_2fa"):
        return {"requires_2fa": True, "temp_token": result["temp_token"]}

    # ── Normal login: build refresh token and return both ──────────────────
    db_user = result["_user"]
    log_app_event("info", "login_success",
                  user_id=db_user.id, email=db_user.email,
                  role=db_user.role, store_id=db_user.store_id, ip=client_ip)
    refresh_payload = {
        "sub": db_user.email,
        "user_id": db_user.id,
        "role": db_user.role,
        "customer_id": db_user.customer_id,
        "store_id": db_user.store_id,
        "is_active": db_user.is_active,
    }
    refresh_token = create_refresh_token(refresh_payload)
    return {"token": result["token"], "refresh_token": refresh_token, "requires_2fa": False}


@router.post("/customer/register")
def customer_register(
    body: CustomerRegisterWithInvite, db: Session = Depends(get_db)
):
    user = customer_register_with_invite(body.token, body.email, body.password, db)
    from utils.auth_utils import create_access_token
    payload = {
        "sub": user.email,
        "user_id": user.id,
        "role": user.role,
        "customer_id": user.customer_id,
        "store_id": user.store_id,
    }
    token = create_access_token(payload)
    return {"token": token, "message": "Account created successfully"}


@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password_route(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    from utils.rate_limit import is_rate_limited, record_attempt
    client_ip = request.client.host if request.client else "unknown"
    key = f"forgot:{client_ip}"
    if is_rate_limited(key):
        raise HTTPException(status_code=429, detail="Too many requests; try again later")
    record_attempt(key)
    result = forgot_password(body.email, db)
    return result


@router.post("/reset-password")
def reset_password_route(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_password(body.token, body.new_password, db)
    return {"message": "Password reset successfully"}


# ---------------------------------------------------------------------------
# /me — current user profile
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserOut)
def get_me(payload: dict = Depends(get_token_payload), db: Session = Depends(get_db)):
    """Return the currently authenticated user's profile."""
    from models.user_model import User
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/me", response_model=UserOut)
def update_me(
    body: UserProfileUpdate,
    payload: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    """Update the currently authenticated user's own profile / password."""
    from models.user_model import User
    from utils.auth_utils import verify_password, hash_password
    from controllers.auth_controller import _validate_password_strength

    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.name is not None:
        user.name = body.name.strip() or user.name
    if body.phone is not None:
        user.phone = body.phone.strip() or None
    if body.address is not None:
        user.address = body.address.strip() or None

    if body.new_password:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="current_password is required to set a new password")
        if not verify_password(body.current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        _validate_password_strength(body.new_password)
        user.hashed_password = hash_password(body.new_password)

    db.commit()
    db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# /refresh — exchange refresh token for new access token
# ---------------------------------------------------------------------------

@router.post("/refresh")
def refresh_token(body: TokenRefreshRequest, db: Session = Depends(get_db)):
    """
    Exchange a valid refresh token for a fresh access token + new refresh token.
    Implements refresh-token rotation: the old token is single-use by design
    (stateless — rotation is enforced by issuing a new one each time).
    """
    from utils.auth_utils import verify_refresh_token, create_access_token, create_refresh_token
    from models.user_model import User

    token_payload = verify_refresh_token(body.refresh_token)
    if not token_payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.id == token_payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    access_payload = {
        "sub": user.email,
        "user_id": user.id,
        "role": user.role,
        "customer_id": user.customer_id,
        "store_id": user.store_id,
        "is_active": user.is_active,
    }
    new_access = create_access_token(access_payload)
    new_refresh = create_refresh_token(access_payload)
    return {"token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}


# ─────────────────────────────────────────────────────────────────────────────
# Self-Registration (new shop owner)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/owner-register")
@limiter.limit("5/minute")
def owner_register_route(
    request: Request,
    body: OwnerRegisterRequest,
    db: Session = Depends(get_db),
):
    """
    New shop owner self-registration.
    Creates a Store + admin User atomically and returns JWT tokens.
    The owner is logged in immediately — no separate login step needed.
    """
    try:
        result = owner_register(
            name=body.name,
            email=body.email,
            password=body.password,
            store_name=body.store_name,
            db=db,
            phone=body.phone,
            city=body.city,
            gstin=body.gstin,
        )
        log_app_event("info", "owner_registered",
                      email=body.email, store=body.store_name)
        return result
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        log_app_event("error", "owner_register_failed", email=body.email, error=str(exc))
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")


# ─────────────────────────────────────────────────────────────────────────────
# 2-Factor Authentication
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/verify-2fa")
@limiter.limit("10/minute")
def verify_2fa_route(
    request: Request,
    body: TwoFAVerifyRequest,
    db: Session = Depends(get_db),
):
    """
    Step 2 of 2FA login. Submit the 6-digit OTP received by email.
    Returns full access + refresh tokens on success.
    """
    return verify_2fa_otp(body.temp_token, body.otp_code, db)


@router.post("/toggle-2fa")
def toggle_2fa_route(
    body: TwoFAToggleRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    """Enable or disable 2FA for the currently logged-in user."""
    return toggle_2fa(payload["user_id"], body.enable, db)
