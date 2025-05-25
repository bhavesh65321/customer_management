from pydantic import BaseModel, validator
from typing import List
from datetime import datetime

class Product(BaseModel):
    productName: str
    metalType: str
    weight: float
    rate: float
    makingCharge: float
    diamondCharge: float
    gstPercent: float
    metalValue: float
    gstAmount: float
    total: float

    @validator(
        "weight", "rate", "makingCharge", "diamondCharge", 
        "gstPercent", "metalValue", "gstAmount", "total", pre=True
    )
    def convert_str_to_float(cls, v):
        return float(v)

class TransactionCreate(BaseModel):
    customerId: int
    customerName: str
    products: List[Product]
    paidAmount: float
    dueAmount: float
    grandTotal: float
    date: datetime


class TransactionResponse(BaseModel):
    id: int
    customerId: int
    customerName: str
    products: List[Product]
    paidAmount: float
    dueAmount: float
    grandTotal: float
    date: datetime

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