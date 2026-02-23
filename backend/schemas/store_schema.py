from pydantic import BaseModel
from typing import Optional


class StoreCreate(BaseModel):
    name: str
    gstin: Optional[str] = None
    bis_reg: Optional[str] = None


class StoreResponse(BaseModel):
    id: int
    name: str
    gstin: Optional[str] = None
    bis_reg: Optional[str] = None

    class Config:
        from_attributes = True


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    gstin: Optional[str] = None
    bis_reg: Optional[str] = None
