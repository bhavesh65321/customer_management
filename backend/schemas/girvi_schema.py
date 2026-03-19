from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class GirviPhotoCreate(BaseModel):
    image_url: str


class GirviPhotoResponse(BaseModel):
    id: int
    loan_id: int
    image_url: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GirviLoanCreate(BaseModel):
    customer_id: int
    jewelry_description: str
    gross_weight: Optional[float] = None
    purity: Optional[float] = None
    principal_amount: float
    interest_rate_per_month: float
    start_date: date
    notes: Optional[str] = None
    photo_urls: Optional[List[str]] = []


class GirviLoanUpdate(BaseModel):
    jewelry_description: Optional[str] = None
    gross_weight: Optional[float] = None
    purity: Optional[float] = None
    notes: Optional[str] = None


class GirviLoanResponse(BaseModel):
    id: int
    store_id: int
    customer_id: int
    jewelry_description: str
    gross_weight: Optional[float] = None
    purity: Optional[float] = None
    principal_amount: float
    interest_rate_per_month: float
    start_date: date
    status: str
    closed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    notes: Optional[str] = None
    customer_name: Optional[str] = None
    photos: Optional[List[GirviPhotoResponse]] = []

    class Config:
        from_attributes = True


class GirviInterestPaymentCreate(BaseModel):
    amount: float
    for_month: str
    notes: Optional[str] = None


class GirviInterestPaymentResponse(BaseModel):
    id: int
    loan_id: int
    amount: float
    for_month: str
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class GirviInterestSummary(BaseModel):
    loan_id: int
    principal: float
    rate_per_month: float
    months_elapsed: int
    total_interest_due: float
    total_interest_paid: float
    interest_outstanding: float
