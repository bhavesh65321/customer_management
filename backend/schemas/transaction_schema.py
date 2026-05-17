from pydantic import BaseModel, validator, model_validator
from typing import List, Optional
from datetime import datetime
from schemas.gst_schema import GSTLineInput


class Product(BaseModel):
    productName: str
    metalType: str
    weight: float
    rate: float
    makingCharge: float
    diamondCharge: float
    gstPercent: Optional[float] = 0.0   # optional — GST handled by GSTLineInput
    metalValue: float
    gstAmount: Optional[float] = 0.0    # optional — GST handled by GSTLineInput
    total: float
    pieceId: Optional[int] = None
    qty: Optional[float] = 1.0          # quantity field added in frontend

    @validator(
        "weight", "rate", "makingCharge", "diamondCharge",
        "gstPercent", "metalValue", "gstAmount", "total", pre=True
    )
    def convert_str_to_float(cls, v):
        if v == "" or v is None:
            return 0.0
        return float(v)

class TransactionCreate(BaseModel):
    customerId: int
    customerName: str
    products: List[Product]
    paidAmount: float
    dueAmount: float
    grandTotal: float
    date: datetime
    billType: Optional[str] = None
    billPhotoUrl: Optional[str] = None
    gst: Optional[GSTLineInput] = None   # ← optional GST data from billing screen

    @model_validator(mode="after")
    def paid_due_equal_grand_total(self):
        paid = self.paidAmount
        due = self.dueAmount
        grand = self.grandTotal
        if paid is not None and due is not None and grand is not None:
            if abs((paid + due) - grand) > 0.01:
                raise ValueError("paidAmount + dueAmount must equal grandTotal")
        return self


class TransactionResponse(BaseModel):
    id: int
    customerId: int
    customerName: str
    products: List[Product]
    paidAmount: float
    dueAmount: float
    grandTotal: float
    date: datetime
    billType: Optional[str] = None
    billPhotoUrl: Optional[str] = None

    class Config:
        from_attributes = True


class TransactionUpdate(BaseModel):
    id: int
    customerId: int
    customerName: str
    products: List[Product]
    paidAmount: float
    dueAmount: float
    grandTotal: float
    date: datetime
    billType: Optional[str] = None
    payment_mode: Optional[str] = None


    class Config:
        from_attributes = True

    @validator('products')
    def validate_products(cls, v):
        if len(v) < 1:
            raise ValueError("At least one product is required")
        return v

    @validator('paidAmount')
    def validate_paid_amount(cls, v, values):
        if 'grandTotal' in values and v > values['grandTotal']:
            raise ValueError("Paid amount cannot exceed grand total")
        return v