from pydantic import BaseModel, Field
from typing import Optional, Any


class CustomerCreate(BaseModel):
    name: str = Field(..., max_length=255)
    father_name: Optional[str] = Field(None, max_length=255)
    primary_phone: str = Field(..., max_length=20)
    secondary_phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=255)
    pincode: Optional[str] = Field(None, max_length=10)
    gender: Optional[str] = Field(None, max_length=10)
    country: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)


class CustomerResponse(BaseModel):
    id: int
    is_active: bool = True
    name: str
    father_name: Optional[str] = None
    primary_phone: str
    secondary_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    gender: Optional[str] = None
    country: Optional[str] = None
    email: Optional[str] = None
    preferences: Optional[Any] = None

    class Config:
        from_attributes = True
   

# class CustomerResponse(CustomerCreate):
#     id: int

#     class Config:
#         orm_mode = True


# Inside your Customer model
