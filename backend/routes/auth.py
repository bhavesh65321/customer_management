from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schemas.user_schema import UserRegister, UserCreate
from config.database import get_db
from controllers.auth_controller import register_user, login_user

router = APIRouter()

@router.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    register_user(user.name, user.email, user.password, db)
    return {"message": "User registered successfully"}

@router.post("/login")
def login(user: UserCreate, db: Session = Depends(get_db)):
    token = login_user(user.email, user.password, db)
    return {"token": token}
