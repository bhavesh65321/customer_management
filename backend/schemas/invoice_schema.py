from pydantic import BaseModel
from typing import Optional, Any


class InvoiceCreate(BaseModel):
    transaction_id: int
    irn: Optional[str] = None
    einv_payload: Optional[Any] = None


class InvoiceResponse(BaseModel):
    id: int
    transaction_id: int
    irn: Optional[str] = None
    einv_payload: Optional[Any] = None

    class Config:
        from_attributes = True
