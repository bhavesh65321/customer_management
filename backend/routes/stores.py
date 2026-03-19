from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from dependencies import require_staff, get_token_payload
from models.store import Store
from schemas.store_schema import StoreCreate, StoreResponse, StoreUpdate

router = APIRouter(tags=["Stores"])


@router.get("/me", response_model=StoreResponse)
def get_my_store(
    payload: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    store_id = payload.get("store_id")
    if store_id is None:
        raise HTTPException(status_code=404, detail="No company linked to your account")
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Company not found")
    return store


@router.get("", response_model=List[StoreResponse])
def list_stores(
    db: Session = Depends(get_db),
    _auth=Depends(require_staff),
):
    return db.query(Store).all()


@router.post("", response_model=StoreResponse)
def create_store(
    data: StoreCreate,
    db: Session = Depends(get_db),
    _auth=Depends(require_staff),
):
    store = Store(
        name=data.name,
        gstin=data.gstin,
        bis_reg=data.bis_reg,
        customer_code=getattr(data, "customer_code", None),
        join_date=getattr(data, "join_date", None),
        address=getattr(data, "address", None),
        location=getattr(data, "location", None),
        is_active=getattr(data, "is_active", True),
        license_type=getattr(data, "license_type", None),
    )
    db.add(store)
    db.commit()
    db.refresh(store)
    return store


@router.get("/{store_id}", response_model=StoreResponse)
def get_store(
    store_id: int,
    db: Session = Depends(get_db),
    _auth=Depends(require_staff),
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


@router.put("/{store_id}", response_model=StoreResponse)
def update_store(
    store_id: int,
    data: StoreUpdate,
    db: Session = Depends(get_db),
    _auth=Depends(require_staff),
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    if data.name is not None:
        store.name = data.name
    if data.gstin is not None:
        store.gstin = data.gstin
    if data.bis_reg is not None:
        store.bis_reg = data.bis_reg
    if hasattr(data, "customer_code") and data.customer_code is not None:
        store.customer_code = data.customer_code
    if hasattr(data, "join_date"):
        store.join_date = data.join_date
    if hasattr(data, "address"):
        store.address = data.address
    if hasattr(data, "location"):
        store.location = data.location
    if hasattr(data, "is_active") and data.is_active is not None:
        store.is_active = data.is_active
    if hasattr(data, "license_type"):
        store.license_type = data.license_type
    if hasattr(data, "logo_url"):
        store.logo_url = data.logo_url
    db.commit()
    db.refresh(store)
    return store


@router.delete("/{store_id}")
def delete_store(
    store_id: int,
    db: Session = Depends(get_db),
    _auth=Depends(require_staff),
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    db.delete(store)
    db.commit()
    return {"message": "Store deleted"}
