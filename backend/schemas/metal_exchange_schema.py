from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MetalExchangeCreate(BaseModel):
    customer_id: int
    type: str
    metal_type: Optional[str] = None
    raw_weight: Optional[float] = None
    raw_purity: Optional[float] = None
    pure_weight: Optional[float] = None
    cash_amount: Optional[float] = None
    making_charges: Optional[float] = None
    rate_per_gram: Optional[float] = None
    notes: Optional[str] = None


class MetalExchangeResponse(BaseModel):
    id: int
    store_id: int
    customer_id: int
    type: str
    metal_type: Optional[str] = None
    raw_weight: Optional[float] = None
    raw_purity: Optional[float] = None
    pure_weight: Optional[float] = None
    cash_amount: Optional[float] = None
    making_charges: Optional[float] = None
    rate_per_gram: Optional[float] = None
    notes: Optional[str] = None
    exchange_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    customer_name: Optional[str] = None

    class Config:
        from_attributes = True


class AdvanceBalanceResponse(BaseModel):
    customer_id: int
    customer_name: str
    advance_metal_weight: float
    advance_metal_purity: Optional[float] = None
    advance_money: float
