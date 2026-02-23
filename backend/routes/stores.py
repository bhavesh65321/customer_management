from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from dependencies import require_staff
from models.store import Store
from schemas.store_schema import StoreCreate, StoreResponse, StoreUpdate

router = APIRouter(tags=["Stores"])


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
    store = Store(name=data.name, gstin=data.gstin, bis_reg=data.bis_reg)
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
