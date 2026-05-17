from typing import Optional
from datetime import date
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=256)
    store_id: Optional[int] = None
    company_identifier: Optional[str] = None


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=256)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=256)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=256)


class CustomerRegisterWithInvite(BaseModel):
    token: str
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: Optional[str]
    email: EmailStr
    role: str
    is_active: bool = True
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
    password: str = Field(..., min_length=8, max_length=256)
    role: str = Field(..., pattern="^(admin|manager|staff|customer)$")
    customer_id: Optional[int] = None
    store_id: Optional[int] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    monthly_pay: Optional[float] = None
    join_date: Optional[date] = None


class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = Field(None, pattern="^(admin|manager|staff|customer)$")
    is_active: Optional[bool] = None
    store_id: Optional[int] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    monthly_pay: Optional[float] = None
    join_date: Optional[date] = None


class WorkerCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=256)
    designation: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    monthly_pay: Optional[float] = None
    join_date: Optional[date] = None


# ---------------------------------------------------------------------------
# /me  — current user profile
# ---------------------------------------------------------------------------

class UserProfileUpdate(BaseModel):
    """Fields the logged-in user may update on their own profile."""
    name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    current_password: Optional[str] = Field(None, min_length=1, max_length=256)
    new_password: Optional[str] = Field(None, min_length=8, max_length=256)


# ---------------------------------------------------------------------------
# Token refresh
# ---------------------------------------------------------------------------

class TokenRefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# Self-Registration (new shop owner creates account + store in one step)
# ---------------------------------------------------------------------------

class OwnerRegisterRequest(BaseModel):
    # Owner account
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=256)
    phone: Optional[str] = Field(None, max_length=20)

    # Store / shop details
    store_name: str = Field(..., min_length=2, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    gstin: Optional[str] = Field(None, max_length=20)


class OwnerRegisterResponse(BaseModel):
    message: str
    token: str
    refresh_token: str
    store_id: int
    store_name: str
    company_code: str       # the generated Company ID staff use to join


# ---------------------------------------------------------------------------
# 2-Factor Authentication
# ---------------------------------------------------------------------------

class TwoFAVerifyRequest(BaseModel):
    """Submit OTP received by email to complete login."""
    temp_token: str
    otp_code: str = Field(..., min_length=6, max_length=6)


class TwoFAToggleRequest(BaseModel):
    """Enable or disable 2FA for the logged-in user."""
    enable: bool
