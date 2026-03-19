from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StockItemCreate(BaseModel):
    name: str
    category: Optional[str] = None
    metal_type: Optional[str] = None
    unit: str = "piece"
    min_quantity: Optional[float] = None


class StockItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    metal_type: Optional[str] = None
    unit: Optional[str] = None
    min_quantity: Optional[float] = None


class StockItemResponse(BaseModel):
    id: int
    store_id: int
    name: str
    category: Optional[str] = None
    metal_type: Optional[str] = None
    unit: str
    min_quantity: Optional[float] = None
    quantity: Optional[float] = None
    is_low_stock: Optional[bool] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StockMovementCreate(BaseModel):
    item_id: int
    quantity: float
    movement_type: str
    reference_id: Optional[int] = None
    notes: Optional[str] = None


class StockMovementResponse(BaseModel):
    id: int
    item_id: int
    quantity: float
    movement_type: str
    reference_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
