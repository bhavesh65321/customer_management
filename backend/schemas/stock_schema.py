from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Categories ────────────────────────────────────────────────────────────────

class StockCategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = None


class StockCategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None


class StockCategoryResponse(BaseModel):
    id: int
    store_id: int
    name: str
    icon: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Stock Items ────────────────────────────────────────────────────────────────

class StockItemCreate(BaseModel):
    name: str
    category: Optional[str] = None
    category_id: Optional[int] = None
    metal_type: Optional[str] = None
    purity_percent: Optional[float] = None
    gross_weight_g: Optional[float] = None
    net_weight_g: Optional[float] = None
    huid: Optional[str] = None
    stone_details: Optional[str] = None
    making_charge_per_g: Optional[float] = None
    unit: str = "piece"
    min_quantity: Optional[float] = None
    reorder_weight_g: Optional[float] = None
    description: Optional[str] = None
    unit_price: Optional[float] = None


class StockItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    category_id: Optional[int] = None
    metal_type: Optional[str] = None
    purity_percent: Optional[float] = None
    gross_weight_g: Optional[float] = None
    net_weight_g: Optional[float] = None
    huid: Optional[str] = None
    stone_details: Optional[str] = None
    making_charge_per_g: Optional[float] = None
    unit: Optional[str] = None
    min_quantity: Optional[float] = None
    reorder_weight_g: Optional[float] = None
    description: Optional[str] = None
    unit_price: Optional[float] = None


class StockItemResponse(BaseModel):
    id: int
    store_id: int
    name: str
    category: Optional[str] = None
    category_id: Optional[int] = None
    metal_type: Optional[str] = None
    purity_percent: Optional[float] = None
    gross_weight_g: Optional[float] = None
    net_weight_g: Optional[float] = None
    huid: Optional[str] = None
    stone_details: Optional[str] = None
    making_charge_per_g: Optional[float] = None
    unit: str
    min_quantity: Optional[float] = None
    reorder_weight_g: Optional[float] = None
    description: Optional[str] = None
    unit_price: Optional[float] = None
    quantity: Optional[float] = None
    is_low_stock: Optional[bool] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Stock Movements ────────────────────────────────────────────────────────────

class StockMovementCreate(BaseModel):
    item_id: int
    quantity: float
    movement_type: str
    movement_reason: Optional[str] = None
    weight_g: Optional[float] = None
    rate_per_g: Optional[float] = None
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    notes: Optional[str] = None
    supplier_name: Optional[str] = None


class StockMovementResponse(BaseModel):
    id: int
    item_id: int
    quantity: float
    movement_type: str
    movement_reason: Optional[str] = None
    weight_g: Optional[float] = None
    rate_per_g: Optional[float] = None
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    notes: Optional[str] = None
    supplier_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
