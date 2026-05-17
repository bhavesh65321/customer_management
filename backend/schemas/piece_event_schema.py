from pydantic import BaseModel
from typing import Any, Dict, Optional
from datetime import datetime


class PieceLifecycleEventCreate(BaseModel):
    event_type: str
    notes: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    karigar_id: Optional[int] = None
    order_id: Optional[int] = None


class PieceLifecycleEventResponse(BaseModel):
    id: int
    store_id: int
    piece_id: int
    event_type: str
    notes: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    karigar_id: Optional[int] = None
    order_id: Optional[int] = None
    transaction_id: Optional[int] = None
    created_by_user_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
