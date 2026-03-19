from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class StoreCreate(BaseModel):
    name: str = Field(..., max_length=255)
    gstin: Optional[str] = Field(None, max_length=20)
    bis_reg: Optional[str] = Field(None, max_length=100)
    join_date: Optional[date] = None
    address: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=20)
    is_active: bool = True
    license_type: Optional[str] = Field(None, pattern="^(general|simple|premium)$")


class StoreResponse(BaseModel):
    id: int
    name: str
    gstin: Optional[str] = None
    bis_reg: Optional[str] = None
    customer_code: Optional[str] = None
    join_date: Optional[date] = None
    address: Optional[str] = None
    location: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: bool = True
    license_type: Optional[str] = None
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    gstin: Optional[str] = None
    bis_reg: Optional[str] = None
    join_date: Optional[date] = None
    address: Optional[str] = None
    location: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None
    license_type: Optional[str] = Field(None, pattern="^(general|simple|premium)$")
    logo_url: Optional[str] = None
