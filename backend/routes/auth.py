from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schemas.user_schema import (
    UserRegister,
    UserCreate,
    UserLogin,
    CustomerRegisterWithInvite,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from config.database import get_db
from controllers.auth_controller import (
    register_user,
    login_user,
    customer_register_with_invite,
    forgot_password,
    reset_password,
)
from models.store import Store

router = APIRouter()


@router.get("/companies")
def list_companies_for_registration(db: Session = Depends(get_db)):
    stores = db.query(Store).filter(Store.is_active == True).order_by(Store.name).all()
    return [{"id": s.id, "name": s.name} for s in stores]


@router.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
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
def login(user: UserLogin, db: Session = Depends(get_db)):
    token = login_user(user.email, user.password, db)
    return {"token": token}


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
def forgot_password_route(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    result = forgot_password(body.email, db)
    return result


@router.post("/reset-password")
def reset_password_route(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_password(body.token, body.new_password, db)
    return {"message": "Password reset successfully"}
