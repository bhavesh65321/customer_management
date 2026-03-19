from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class OrderCreate(BaseModel):
    customer_id: int
    type: str
    description: Optional[str] = None
    item_description: Optional[str] = None
    expected_date: Optional[date] = None


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    amount_charged: Optional[float] = None
    description: Optional[str] = None
    item_description: Optional[str] = None
    expected_date: Optional[date] = None


class OrderResponse(BaseModel):
    id: int
    store_id: int
    customer_id: int
    type: str
    description: Optional[str] = None
    item_description: Optional[str] = None
    expected_date: Optional[date] = None
    status: str
    delivered_at: Optional[datetime] = None
    amount_charged: Optional[float] = None
    created_at: Optional[datetime] = None
    customer_name: Optional[str] = None

    class Config:
        from_attributes = True
