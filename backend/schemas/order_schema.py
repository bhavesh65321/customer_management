from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class OrderCreate(BaseModel):
    customer_id: int
    type: str
    description: Optional[str] = None
    item_description: Optional[str] = None
    expected_date: Optional[date] = None
    karigar_id: Optional[int] = None
    workflow_step: Optional[str] = None
    workflow_template_id: Optional[int] = None
    # Advance at order time
    advance_cash: Optional[float] = None
    advance_metal_weight: Optional[float] = None
    advance_metal_purity: Optional[float] = None
    advance_metal_type: Optional[str] = None


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    amount_charged: Optional[float] = None
    description: Optional[str] = None
    item_description: Optional[str] = None
    expected_date: Optional[date] = None
    karigar_id: Optional[int] = None
    workflow_step: Optional[str] = None


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
    karigar_id: Optional[int] = None
    workflow_step: Optional[str] = None
    workflow_template_id: Optional[int] = None
    advance_cash: Optional[float] = None
    advance_metal_weight: Optional[float] = None
    advance_metal_purity: Optional[float] = None
    advance_metal_type: Optional[str] = None
    created_at: Optional[datetime] = None
    customer_name: Optional[str] = None
    karigar_name: Optional[str] = None
    order_steps: Optional[List] = []

    class Config:
        from_attributes = True
