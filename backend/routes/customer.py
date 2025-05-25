from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from models.customer import Customer
from schemas.customer import CustomerCreate, CustomerResponse
from config.database import get_db
from typing import List, Optional


router = APIRouter(tags=["Customers"]) 


@router.post("/add", response_model=CustomerResponse, include_in_schema=True)
def add_customer(customer: CustomerCreate,  db: Session = Depends(get_db)):
    try:
        new_customer = Customer(
            name=customer.name,
            father_name=customer.father_name,
            primary_phone=customer.primary_phone,
            secondary_phone=customer.secondary_phone,
            address=customer.address,
            city=customer.city,
            pincode=customer.pincode,
            gender=customer.gender,
            country=customer.country
        )
        db.add(new_customer)
        db.commit()
        db.refresh(new_customer)
        return new_customer
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search", response_model=List[CustomerResponse], include_in_schema=True)
def search_customers(query: str = "", db: Session = Depends(get_db)):
    customers = db.query(Customer).filter(Customer.name.ilike(f"%{query}%")).all()
    return customers

@router.get("/all", response_model=List[CustomerResponse], include_in_schema=True)
def get_all_customers(db: Session = Depends(get_db)):
    return db.query(Customer).all()


@router.get("/list", response_model=List[CustomerResponse])
def list_customers(
    search: Optional[str] = Query(None),
    filter: Optional[str] = Query(None),  # e.g. "paid" or "due"
    sort: Optional[str] = Query(None),    # "name", "recent", "oldest"
    db: Session = Depends(get_db),
):
    query = db.query(Customer)

    # Search by name or phone
    if search:
        query = query.filter(
            or_(
                Customer.name.ilike(f"%{search}%"),
                Customer.primary_phone.ilike(f"%{search}%"),
            )
        )

    # Filter by status (assuming you have a status field like 'paid'/'due')
    if filter in ["paid", "due"]:
        query = query.filter(Customer.status == filter)

    # Sorting
    if sort == "name":
        query = query.order_by(Customer.name.asc())
    elif sort == "recent":
        query = query.order_by(Customer.id.desc())
    elif sort == "oldest":
        query = query.order_by(Customer.id.asc())

    return query.all()


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: int, db: Session = Depends(get_db)):
    try:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer
    except Exception as e:
        print("❌ Error fetching customer:", e)
        raise HTTPException(status_code=500, detail=str(e))



