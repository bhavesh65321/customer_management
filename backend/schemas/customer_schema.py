# from pydantic import BaseModel
# from typing import Optional

# class CustomerCreate(BaseModel):
#     name: str
#     father_name: Optional[str] = None
#     phone_primary: Optional[str] = None
#     phone_secondary: Optional[str] = None
#     address: Optional[str] = None
#     city: Optional[str] = None
#     pincode: Optional[str] = None
#     gender: Optional[str] = None
#     country: Optional[str] = None

# class CustomerOut(CustomerCreate):
#     id: int

#     class Config:
#         orm_mode = True
