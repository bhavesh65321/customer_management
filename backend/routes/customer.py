from datetime import datetime, timedelta
import secrets
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from models.customer import Customer
from models.customer_invite import CustomerInvite
from schemas.customer import CustomerCreate, CustomerResponse
from config.database import get_db
from dependencies import require_staff, get_token_payload
from typing import List, Optional


router = APIRouter(tags=["Customers"])


def _store_filter(q, payload):
    store_id = payload.get("store_id")
    if store_id is not None:
        q = q.filter(Customer.store_id == store_id)
    else:
        q = q.filter(Customer.store_id.is_(None))
    return q


@router.post("/add", response_model=CustomerResponse, include_in_schema=True)
def add_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    try:
        store_id = payload.get("store_id")
        new_customer = Customer(
            name=customer.name,
            father_name=customer.father_name,
            primary_phone=customer.primary_phone,
            secondary_phone=customer.secondary_phone,
            address=customer.address,
            city=customer.city,
            pincode=customer.pincode,
            gender=customer.gender,
            country=customer.country,
            email=customer.email,
            store_id=store_id,
        )
        db.add(new_customer)
        db.commit()
        db.refresh(new_customer)
        return new_customer
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    


@router.put("/update/{customer_id}", response_model=CustomerResponse, include_in_schema=True)
def update_customer(
    customer_id: int,
    updated_data: CustomerCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    try:
        q = db.query(Customer).filter(Customer.id == customer_id)
        q = _store_filter(q, payload)
        customer = q.first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

        customer.name = updated_data.name
        customer.father_name = updated_data.father_name
        customer.primary_phone = updated_data.primary_phone
        customer.secondary_phone = updated_data.secondary_phone
        customer.address = updated_data.address
        customer.city = updated_data.city
        customer.pincode = updated_data.pincode
        customer.gender = updated_data.gender
        customer.country = updated_data.country
        customer.email = updated_data.email

        db.commit()
        db.refresh(customer)
        return customer

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    


@router.get("/search", response_model=List[CustomerResponse], include_in_schema=True)
def search_customers(
    query: str = "",
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(Customer).filter(Customer.name.ilike(f"%{query}%"))
    q = _store_filter(q, payload)
    return q.all()


@router.get("/all", response_model=List[CustomerResponse], include_in_schema=True)
def get_all_customers(
    status: Optional[str] = Query(None, description="active, inactive, or all"),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(Customer)
    q = _store_filter(q, payload)
    if status == "inactive":
        q = q.filter(Customer.is_active == False)
    elif status != "all":
        q = q.filter(Customer.is_active == True)
    return q.all()


@router.get("/list", response_model=List[CustomerResponse])
def list_customers(
    search: Optional[str] = Query(None),
    filter: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    query = db.query(Customer)
    query = _store_filter(query, payload)

    if search:
        query = query.filter(
            or_(
                Customer.name.ilike(f"%{search}%"),
                Customer.primary_phone.ilike(f"%{search}%"),
            )
        )

    # Filter by status when model supports it (e.g. paid/due from transactions)
    # if filter in ["paid", "due"]:
    #     query = query.filter(Customer.status == filter)

    # Sorting
    if sort == "name":
        query = query.order_by(Customer.name.asc())
    elif sort == "recent":
        query = query.order_by(Customer.id.desc())
    elif sort == "oldest":
        query = query.order_by(Customer.id.asc())

    return query.all()


@router.post("/invite/{customer_id}")
def create_invite(
    customer_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(Customer).filter(Customer.id == customer_id)
    q = _store_filter(q, payload)
    customer = q.first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=7)
    invite = CustomerInvite(
        customer_id=customer_id,
        token=token,
        expires_at=expires_at,
    )
    db.add(invite)
    db.commit()
    link = f"/customer/join?token={token}"
    return {"invite_link": link, "token": token, "expires_at": expires_at.isoformat()}


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    try:
        q = db.query(Customer).filter(Customer.id == customer_id)
        q = _store_filter(q, payload)
        customer = q.first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer
    except Exception as e:
        print("❌ Error fetching customer:", e)
        raise HTTPException(status_code=500, detail=str(e))
    

@router.delete("/delete/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(Customer).filter(Customer.id == customer_id)
    q = _store_filter(q, payload)
    customer = q.first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer.is_active = False
    db.commit()
    return {"message": "Customer marked as inactive"}

          



