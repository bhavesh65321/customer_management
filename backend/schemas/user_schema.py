from typing import Optional
from datetime import date
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=256)
    store_id: Optional[int] = None
    company_identifier: Optional[str] = None

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=256)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=256)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=1, max_length=256)


class CustomerRegisterWithInvite(BaseModel):
    token: str
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: Optional[str]
    email: EmailStr
    role: str
    store_id: Optional[int] = None
    customer_id: Optional[int] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    monthly_pay: Optional[float] = None
    join_date: Optional[date] = None

    class Config:
        from_attributes = True


class AdminUserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=256)
    role: str = Field(..., pattern="^(admin|staff|customer)$")
    customer_id: Optional[int] = None
    store_id: Optional[int] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    monthly_pay: Optional[float] = None
    join_date: Optional[date] = None


class WorkerCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=256)
    designation: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    monthly_pay: Optional[float] = None
    join_date: Optional[date] = None


class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    monthly_pay: Optional[float] = None
    join_date: Optional[date] = None
    store_id: Optional[int] = None
