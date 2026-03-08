from pydantic import BaseModel
from typing import Optional, Any

class CustomerCreate(BaseModel):
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
