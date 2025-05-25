from pydantic import BaseModel
from typing import Optional

class CustomerCreate(BaseModel):
    name: str
    father_name: str
    primary_phone: str
    secondary_phone: Optional[str]
    address: str
    city: str
    pincode: str
    gender: str
    country: str



from typing import Optional

class CustomerResponse(BaseModel):
    id: int
    name: str
    father_name: str
    primary_phone: str
    secondary_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    gender: Optional[str] = None
    country: Optional[str] = None

    class Config:
        from_attributes = True
   

# class CustomerResponse(CustomerCreate):
#     id: int

#     class Config:
#         orm_mode = True


# Inside your Customer model
