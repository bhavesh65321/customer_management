from pydantic import BaseModel
from typing import Optional, Union
from datetime import datetime


class KarigarCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    notes: Optional[str] = None
    rate_per_gram: Optional[Union[float, str]] = None


class KarigarUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    rate_per_gram: Optional[Union[float, str]] = None
    is_active: Optional[bool] = None


class KarigarResponse(BaseModel):
    id: int
    store_id: int
    name: str
    phone: Optional[str] = None
    notes: Optional[str] = None
    rate_per_gram: Optional[Union[float, str]] = None
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
