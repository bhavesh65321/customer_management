from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas.user_schema import UserRegister, UserCreate, CustomerRegisterWithInvite
from config.database import get_db
from controllers.auth_controller import (
    register_user,
    login_user,
    customer_register_with_invite,
)

router = APIRouter()


@router.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    register_user(user.name, user.email, user.password, db)
    return {"message": "User registered successfully"}


@router.post("/login")
def login(user: UserCreate, db: Session = Depends(get_db)):
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
