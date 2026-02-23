from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MetalRateCreate(BaseModel):
    metal_type: str
    rate_per_unit: float
    unit: str = "gram"


class MetalRateResponse(BaseModel):
    id: int
    metal_type: str
    rate_per_unit: float
    unit: str
    effective_from: Optional[datetime] = None

    class Config:
        from_attributes = True
