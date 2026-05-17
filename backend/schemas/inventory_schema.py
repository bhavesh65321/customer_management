from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class InventoryPieceCreate(BaseModel):
    serial: str
    huid: Optional[str] = None
    metal_type: str
    gross_weight: float
    net_weight: float
    purity: Optional[float] = None
    store_id: Optional[int] = None
    certificate_ref: Optional[str] = None
    stone_weight_carat: Optional[float] = None
    stone_type: Optional[str] = None
    wastage_pct: Optional[float] = None
    location_bin: Optional[str] = None
    design_sku: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class InventoryPieceResponse(BaseModel):
    id: int
    serial: str
    huid: Optional[str] = None
    metal_type: str
    gross_weight: float
    net_weight: float
    purity: Optional[float] = None
    store_id: Optional[int] = None
    certificate_ref: Optional[str] = None
    stone_weight_carat: Optional[float] = None
    stone_type: Optional[str] = None
    wastage_pct: Optional[float] = None
    location_bin: Optional[str] = None
    design_sku: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InventoryPieceUpdate(BaseModel):
    huid: Optional[str] = None
    metal_type: Optional[str] = None
    gross_weight: Optional[float] = None
    net_weight: Optional[float] = None
    purity: Optional[float] = None
    store_id: Optional[int] = None
    certificate_ref: Optional[str] = None
    stone_weight_carat: Optional[float] = None
    stone_type: Optional[str] = None
    wastage_pct: Optional[float] = None
    location_bin: Optional[str] = None
    design_sku: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
