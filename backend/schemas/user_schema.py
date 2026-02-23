from typing import Optional
from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class CustomerRegisterWithInvite(BaseModel):
    token: str
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: Optional[str]
    email: EmailStr
    role: str

    class Config:
        from_attributes = True
