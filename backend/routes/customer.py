from datetime import datetime, timedelta
import secrets
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile
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


def _cell_value(cell):
    if cell is None:
        return None
    v = cell.value
    if v is None:
        return None
    return str(v).strip() if isinstance(v, str) else v


@router.post("/import")
def import_customers_excel(
    file: UploadFile,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    if not file.filename or not (file.filename.endswith(".xlsx") or file.filename.endswith(".xls")):
        raise HTTPException(status_code=400, detail="Upload an Excel file (.xlsx)")
    try:
        from openpyxl import load_workbook
    except ImportError:
        raise HTTPException(status_code=500, detail="Excel support not installed (openpyxl)")
    store_id = payload.get("store_id")
    try:
        wb = load_workbook(filename=file.file, read_only=True, data_only=True)
        sheet = wb.active
        rows = list(sheet.iter_rows(min_row=1, max_row=min(sheet.max_row, 2000)))
        wb.close()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Excel file: {str(e)}")
    if not rows:
        return {"imported": 0, "errors": ["Sheet is empty."]}
    header = [_cell_value(c) for c in rows[0]]
    col_index = {}
    for i, h in enumerate(header):
        if h:
            key = str(h).lower().replace(" ", "_")
            if key not in col_index:
                col_index[key] = i
    name_col = col_index.get("name") if "name" in col_index else None
    phone_col = col_index.get("phone") or col_index.get("primary_phone") or col_index.get("mobile")
    if name_col is None or phone_col is None:
        return {
            "imported": 0,
            "errors": ["Excel must have columns 'Name' and 'Phone' (or 'Primary Phone' / 'Mobile')."],
        }
    email_col = col_index.get("email")
    address_col = col_index.get("address")
    imported = 0
    errors = []
    for row_idx, row in enumerate(rows[1:], start=2):
        cells = [_cell_value(c) for c in row]
        name = cells[name_col] if name_col < len(cells) else None
        phone = cells[phone_col] if phone_col < len(cells) else None
        if not name or not str(name).strip():
            errors.append(f"Row {row_idx}: Name is required")
            continue
        if not phone or not str(phone).strip():
            errors.append(f"Row {row_idx}: Phone is required")
            continue
        name = str(name).strip()
        phone = str(phone).strip()
        email = cells[email_col] if email_col is not None and email_col < len(cells) and cells[email_col] else None
        if email:
            email = str(email).strip()
        address = cells[address_col] if address_col is not None and address_col < len(cells) and cells[address_col] else None
        if address:
            address = str(address).strip()
        try:
            new_customer = Customer(
                name=name,
                primary_phone=phone,
                email=email or None,
                address=address or None,
                store_id=store_id,
            )
            db.add(new_customer)
            db.commit()
            imported += 1
        except Exception as e:
            db.rollback()
            errors.append(f"Row {row_idx}: {str(e)}")
    return {"imported": imported, "errors": errors[:50]}


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

          



