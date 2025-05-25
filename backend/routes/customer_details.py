# from fastapi import APIRouter, HTTPException, Depends, Query
# from sqlalchemy.orm import Session
# from sqlalchemy import or_
# from models.customer import Customer
# from schemas.customer import CustomerCreate, CustomerResponse
# from config.database import get_db
# from typing import List, Optional


# router = APIRouter(tags=["Customers"])  # ✅ REMOVE prefix here

# @router.get("/{customer_id}", response_model=List[CustomerResponse])
# async def get_customer(customer_id: int, db: Session = Depends(get_db)):
#     customer = db.query(Customer).filter(Customer.id == customer_id).first()
#     if not customer:
#         raise HTTPException(status_code=404, detail="Customer not found")
#     return customer