from pydantic import BaseModel
from typing import Optional


class InventoryPieceCreate(BaseModel):
    serial: str
    huid: Optional[str] = None
    metal_type: str
    gross_weight: float
    net_weight: float
    purity: Optional[float] = None
    store_id: Optional[int] = None
    certificate_ref: Optional[str] = None


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
