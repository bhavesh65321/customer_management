from math import ceil
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from config.database import get_db
from dependencies import require_staff
from core.db_filters import apply_store_filter, resolve_write_store_id
from models.stock_item import StockItem, StockMovement, StockCategory
from schemas.stock_schema import (
    StockCategoryCreate,
    StockCategoryUpdate,
    StockCategoryResponse,
    StockItemCreate,
    StockItemUpdate,
    StockItemResponse,
    StockMovementCreate,
    StockMovementResponse,
)
from utils.activity import log_activity

router = APIRouter(tags=["Stock"])

MOVEMENT_TYPES = ["purchase", "sale", "return", "order_use", "adjust",
                  "karigar_out", "karigar_in", "damage", "return_customer"]
MOVEMENT_REASONS = [
    "purchase", "sale", "return_customer", "karigar_out",
    "karigar_in", "adjustment", "damage",
]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _current_quantity(db: Session, item_id: int) -> float:
    r = (
        db.query(func.coalesce(func.sum(StockMovement.quantity), 0))
        .filter(StockMovement.item_id == item_id)
        .scalar()
    )
    return float(r or 0)


def _bulk_quantities(db: Session, item_ids: list) -> dict:
    """Return {item_id: quantity} for all given IDs in a single SQL query."""
    if not item_ids:
        return {}
    rows = (
        db.query(StockMovement.item_id, func.coalesce(func.sum(StockMovement.quantity), 0))
        .filter(StockMovement.item_id.in_(item_ids))
        .group_by(StockMovement.item_id)
        .all()
    )
    result = {iid: 0.0 for iid in item_ids}
    for item_id, qty in rows:
        result[item_id] = float(qty or 0)
    return result


def _enrich(item: StockItem, qty: float) -> StockItemResponse:
    low = item.min_quantity is not None and qty < item.min_quantity
    out = StockItemResponse.model_validate(item)
    out.quantity = round(qty, 3)
    out.is_low_stock = low
    return out


# ─── Categories ───────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list)
def list_categories(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(StockCategory)
    q = apply_store_filter(q, StockCategory, payload)
    return q.order_by(StockCategory.name).all()


@router.post("/categories", response_model=StockCategoryResponse)
def create_category(
    data: StockCategoryCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = resolve_write_store_id(payload, db)
    cat = StockCategory(store_id=store_id, name=data.name.strip(), icon=data.icon)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.patch("/categories/{cat_id}", response_model=StockCategoryResponse)
def update_category(
    cat_id: int,
    data: StockCategoryUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    cat = db.query(StockCategory).filter(StockCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if data.name is not None:
        cat.name = data.name.strip()
    if data.icon is not None:
        cat.icon = data.icon
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categories/{cat_id}")
def delete_category(
    cat_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    cat = db.query(StockCategory).filter(StockCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    # unlink items
    db.query(StockItem).filter(StockItem.category_id == cat_id).update({"category_id": None})
    db.delete(cat)
    db.commit()
    return {"ok": True}


# ─── Dashboard / Summary ──────────────────────────────────────────────────────

@router.get("/dashboard")
def stock_dashboard(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(StockItem)
    q = apply_store_filter(q, StockItem, payload)
    items = q.all()

    # Single query for all quantities — eliminates N+1
    qty_map = _bulk_quantities(db, [item.id for item in items])

    total_items = len(items)
    low_stock_count = 0
    total_gold_g = 0.0
    total_silver_g = 0.0
    total_other_pieces = 0

    for item in items:
        qty = qty_map.get(item.id, 0.0)
        if item.min_quantity is not None and qty < item.min_quantity:
            low_stock_count += 1
        metal = (item.metal_type or "").lower()
        if metal == "gold":
            if item.net_weight_g:
                total_gold_g += qty * item.net_weight_g
        elif metal == "silver":
            if item.net_weight_g:
                total_silver_g += qty * item.net_weight_g
        else:
            total_other_pieces += int(qty)

    # recent 10 movements
    mov_q = (
        db.query(StockMovement)
        .join(StockItem, StockMovement.item_id == StockItem.id)
    )
    mov_q = apply_store_filter(mov_q, StockItem, payload)
    recent = mov_q.order_by(StockMovement.created_at.desc()).limit(10).all()

    return {
        "total_items": total_items,
        "low_stock_count": low_stock_count,
        "total_gold_g": round(total_gold_g, 2),
        "total_silver_g": round(total_silver_g, 2),
        "total_other_pieces": total_other_pieces,
        "recent_movements": [
            {
                "id": m.id,
                "item_id": m.item_id,
                "quantity": m.quantity,
                "movement_type": m.movement_type,
                "movement_reason": m.movement_reason,
                "weight_g": m.weight_g,
                "notes": m.notes,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in recent
        ],
    }


# ─── Items ────────────────────────────────────────────────────────────────────

@router.get("/items", response_model=list)
def list_items(
    low_stock_only: bool = Query(False),
    category_id: Optional[int] = Query(None),
    metal_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(0, ge=0, description="1-based page. 0 = all (legacy)"),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(StockItem)
    q = apply_store_filter(q, StockItem, payload)
    if category_id:
        q = q.filter(StockItem.category_id == category_id)
    if metal_type:
        q = q.filter(StockItem.metal_type == metal_type)
    if search:
        q = q.filter(StockItem.name.ilike(f"%{search}%"))

    total_q = q  # reference before pagination for count

    if page > 0:
        items = q.order_by(StockItem.name).offset((page - 1) * page_size).limit(page_size).all()
    else:
        items = q.order_by(StockItem.name).all()

    qty_map = _bulk_quantities(db, [item.id for item in items])

    result = []
    for item in items:
        qty = qty_map.get(item.id, 0.0)
        if low_stock_only and not (item.min_quantity is not None and qty < item.min_quantity):
            continue
        result.append(_enrich(item, qty))

    if page > 0:
        total = total_q.count()
        headers = {
            "X-Total-Count": str(total),
            "X-Page": str(page),
            "X-Page-Size": str(page_size),
            "X-Total-Pages": str(ceil(total / page_size) if total else 0),
            "Access-Control-Expose-Headers": "X-Total-Count, X-Page, X-Page-Size, X-Total-Pages",
        }
        return JSONResponse(content=result, headers=headers)

    return result


@router.post("/items", response_model=StockItemResponse)
def create_item(
    data: StockItemCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = resolve_write_store_id(payload, db, getattr(data, 'store_id', None))
    existing = (
        db.query(StockItem)
        .filter(StockItem.store_id == store_id, func.lower(StockItem.name) == data.name.strip().lower())
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="An item with this name already exists in your store")
    item = StockItem(
        store_id=store_id,
        name=data.name.strip(),
        category=data.category,
        category_id=data.category_id,
        metal_type=data.metal_type,
        purity_percent=data.purity_percent,
        gross_weight_g=data.gross_weight_g,
        net_weight_g=data.net_weight_g,
        huid=data.huid,
        stone_details=data.stone_details,
        making_charge_per_g=data.making_charge_per_g,
        unit=data.unit or "piece",
        min_quantity=data.min_quantity,
        reorder_weight_g=data.reorder_weight_g,
        description=data.description,
        unit_price=data.unit_price,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    log_activity(
        db=db,
        payload=payload,
        action="created",
        entity_type="stock_item",
        entity_id=str(item.id),
        message=f"Stock item '{item.name}' created",
        store_id=store_id,
    )
    return _enrich(item, 0)


@router.get("/items/{item_id}", response_model=StockItemResponse)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(StockItem).filter(StockItem.id == item_id)
    q = apply_store_filter(q, StockItem, payload)
    item = q.first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return _enrich(item, _current_quantity(db, item.id))


@router.patch("/items/{item_id}", response_model=StockItemResponse)
def update_item(
    item_id: int,
    data: StockItemUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(StockItem).filter(StockItem.id == item_id)
    q = apply_store_filter(q, StockItem, payload)
    item = q.first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for field in [
        "name", "category", "category_id", "metal_type", "purity_percent",
        "gross_weight_g", "net_weight_g", "huid", "stone_details",
        "making_charge_per_g", "unit", "min_quantity", "reorder_weight_g",
        "description", "unit_price",
    ]:
        val = getattr(data, field, None)
        if val is not None:
            setattr(item, field, val)
    db.commit()
    db.refresh(item)
    return _enrich(item, _current_quantity(db, item.id))


@router.delete("/items/{item_id}")
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(StockItem).filter(StockItem.id == item_id)
    q = apply_store_filter(q, StockItem, payload)
    item = q.first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}


# ─── Movements ────────────────────────────────────────────────────────────────

@router.post("/movements", response_model=StockMovementResponse)
def create_movement(
    data: StockMovementCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(StockItem).filter(StockItem.id == data.item_id)
    q = apply_store_filter(q, StockItem, payload)
    item = q.first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    quantity = data.quantity
    out_types = {"sale", "order_use", "karigar_out", "damage"}
    mvt = data.movement_type
    if mvt in out_types or (data.movement_reason in out_types):
        quantity = -abs(quantity)
    else:
        quantity = abs(quantity)

    current = _current_quantity(db, data.item_id)
    if quantity < 0 and current + quantity < 0:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Current: {current:.3f}, requested: {abs(quantity):.3f}",
        )

    mov = StockMovement(
        item_id=data.item_id,
        quantity=quantity,
        movement_type=data.movement_type,
        movement_reason=data.movement_reason,
        weight_g=data.weight_g,
        rate_per_g=data.rate_per_g,
        reference_id=data.reference_id,
        reference_type=data.reference_type,
        notes=data.notes,
        supplier_name=data.supplier_name,
        created_by=payload.get("user_id"),
    )
    db.add(mov)
    db.commit()
    db.refresh(mov)
    log_activity(
        db=db,
        payload=payload,
        action="created",
        entity_type="stock_movement",
        entity_id=str(mov.id),
        message=f"Stock movement '{data.movement_type}' for item #{data.item_id} qty={quantity:+.3f}",
        store_id=item.store_id,
    )
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
    return q.order_by(StockMovement.created_at.desc()).limit(200).all()


@router.get("/low-stock", response_model=list)
def low_stock_items(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(StockItem)
    q = apply_store_filter(q, StockItem, payload)
    items = q.order_by(StockItem.name).all()
    result = []
    for item in items:
        qty = _current_quantity(db, item.id)
        if item.min_quantity is not None and qty < item.min_quantity:
            result.append(_enrich(item, qty))
    return result
