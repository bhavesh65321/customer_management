# from fastapi import APIRouter, Depends, HTTPException
# from sqlalchemy.orm import Session
# from config.database import SessionLocal
# from schemas.customer_schema import CustomerCreate, CustomerOut
# from controllers.customer_controller import create_customer, get_customers
# from typing import List

# router = APIRouter(prefix="/api/customer", tags=["Customers"])

# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()

# @router.post("/", response_model=CustomerOut)
# def add_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
#     return create_customer(db, customer)

# @router.get("/", response_model=List[CustomerOut])
# def fetch_customers(db: Session = Depends(get_db)):
#     return get_customers(db)