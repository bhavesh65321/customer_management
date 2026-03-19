from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from config.database import get_db
from dependencies import require_staff
from core.db_filters import apply_store_filter
from models.stock_item import StockItem, StockMovement
from schemas.stock_schema import (
    StockItemCreate,
    StockItemUpdate,
    StockItemResponse,
    StockMovementCreate,
    StockMovementResponse,
)

router = APIRouter(tags=["Stock"])

MOVEMENT_TYPES = ["purchase", "sale", "return", "order_use", "adjust"]


def _current_quantity(db: Session, item_id: int) -> float:
    r = (
        db.query(func.coalesce(func.sum(StockMovement.quantity), 0))
        .filter(StockMovement.item_id == item_id)
        .scalar()
    )
    return float(r or 0)


@router.get("/items", response_model=list)
def list_items(
    low_stock_only: bool = Query(False),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(StockItem)
    q = apply_store_filter(q, StockItem, payload)
    items = q.order_by(StockItem.name).all()
    result = []
    for item in items:
        qty = _current_quantity(db, item.id)
        low = item.min_quantity is not None and qty < item.min_quantity
        if low_stock_only and not low:
            continue
        r = StockItemResponse.model_validate(item)
        r.quantity = round(qty, 2)
        r.is_low_stock = low
        result.append(r)
    return result


@router.post("/items", response_model=StockItemResponse)
def create_item(
    data: StockItemCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    if store_id is None:
        raise HTTPException(status_code=403, detail="Store required")
    existing_name = (
        db.query(StockItem)
        .filter(StockItem.store_id == store_id, func.lower(StockItem.name) == data.name.strip().lower())
        .first()
    )
    if existing_name:
        raise HTTPException(status_code=400, detail="An item with this name already exists in your store")
    item = StockItem(
        store_id=store_id,
        name=data.name,
        category=data.category,
        metal_type=data.metal_type,
        unit=data.unit or "piece",
        min_quantity=data.min_quantity,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    out = StockItemResponse.model_validate(item)
    out.quantity = 0
    out.is_low_stock = False
    return out


@router.get("/items/{item_id}", response_model=StockItemResponse)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    item = db.query(StockItem).filter(StockItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    q = db.query(StockItem).filter(StockItem.id == item_id)
    q = apply_store_filter(q, StockItem, payload)
    if not q.first():
        raise HTTPException(status_code=404, detail="Item not found")
    qty = _current_quantity(db, item.id)
    out = StockItemResponse.model_validate(item)
    out.quantity = round(qty, 2)
    out.is_low_stock = (
        item.min_quantity is not None and qty < item.min_quantity
    )
    return out


@router.patch("/items/{item_id}", response_model=StockItemResponse)
def update_item(
    item_id: int,
    data: StockItemUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    item = db.query(StockItem).filter(StockItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    q = db.query(StockItem).filter(StockItem.id == item_id)
    q = apply_store_filter(q, StockItem, payload)
    if not q.first():
        raise HTTPException(status_code=404, detail="Item not found")
    if data.name is not None:
        item.name = data.name
    if data.category is not None:
        item.category = data.category
    if data.metal_type is not None:
        item.metal_type = data.metal_type
    if data.unit is not None:
        item.unit = data.unit
    if data.min_quantity is not None:
        item.min_quantity = data.min_quantity
    db.commit()
    db.refresh(item)
    out = StockItemResponse.model_validate(item)
    out.quantity = _current_quantity(db, item.id)
    out.is_low_stock = (
        item.min_quantity is not None and out.quantity < item.min_quantity
    )
    return out


@router.post("/movements", response_model=StockMovementResponse)
def create_movement(
    data: StockMovementCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    if data.movement_type not in MOVEMENT_TYPES:
        raise HTTPException(
            status_code=400, detail=f"movement_type must be one of {MOVEMENT_TYPES}"
        )
    item = db.query(StockItem).filter(StockItem.id == data.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    q = db.query(StockItem).filter(StockItem.id == data.item_id)
    q = apply_store_filter(q, StockItem, payload)
    if not q.first():
        raise HTTPException(status_code=404, detail="Item not found")
    current = _current_quantity(db, data.item_id)
    quantity = data.quantity
    if data.movement_type in ("sale", "order_use"):
        quantity = -abs(quantity)
    else:
        quantity = abs(quantity)
    if quantity < 0 and current + quantity < 0:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Current: {current}, requested: {abs(quantity)}",
        )
    mov = StockMovement(
        item_id=data.item_id,
        quantity=quantity,
        movement_type=data.movement_type,
        reference_id=data.reference_id,
        notes=data.notes,
    )
    db.add(mov)
    db.commit()
    db.refresh(mov)
    return mov


@router.get("/movements", response_model=list)
def list_movements(
    item_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(StockMovement).join(StockItem, StockMovement.item_id == StockItem.id)
    q = apply_store_filter(q, StockItem, payload)
    if item_id is not None:
        q = q.filter(StockMovement.item_id == item_id)
    q = q.order_by(StockMovement.created_at.desc())
    return q.limit(200).all()


@router.get("/low-stock", response_model=list)
def low_stock_items(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    return list_items(low_stock_only=True, db=db, payload=payload)
