from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.customer import Customer
from schemas.customer_schema import CustomerCreate

def create_customer(db: Session, customer: CustomerCreate):
    db_customer = Customer(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def get_customers(db: Session):
    return db.query(Customer).all()
