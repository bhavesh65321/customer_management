from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from config.database import get_db


def _schema_keys(schema_class):
    return list(getattr(schema_class, "model_fields", None) or getattr(schema_class, "__fields__", {}) or [])
from dependencies import require_staff
from core.db_filters import apply_store_filter
from models.order_repair import Order
from models.customer import Customer
from schemas.order_schema import OrderCreate, OrderUpdate, OrderResponse

router = APIRouter(tags=["Orders & Repairs"])

ORDER_TYPES = ["new_order", "repair"]
STATUSES = ["pending", "in_progress", "ready", "delivered"]


@router.get("", response_model=list)
def list_orders(
    customer_id: Optional[int] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(Order).join(Customer, Order.customer_id == Customer.id)
    q = apply_store_filter(q, Order, payload)
    if customer_id is not None:
        q = q.filter(Order.customer_id == customer_id)
    if type:
        q = q.filter(Order.type == type)
    if status:
        q = q.filter(Order.status == status)
    q = q.order_by(Order.created_at.desc())
    rows = q.all()
    keys = _schema_keys(OrderResponse)
    return [
        OrderResponse(
            **{k: getattr(r, k) for k in keys if hasattr(r, k)},
            customer_name=r.customer.name,
        )
        for r in rows
    ]


@router.post("", response_model=OrderResponse)
def create_order(
    data: OrderCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    if store_id is None:
        raise HTTPException(status_code=403, detail="Store required")
    if data.type not in ORDER_TYPES:
        raise HTTPException(status_code=400, detail=f"type must be one of {ORDER_TYPES}")
    customer = (
        db.query(Customer)
        .filter(Customer.id == data.customer_id, Customer.store_id == store_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    order = Order(
        store_id=store_id,
        customer_id=data.customer_id,
        type=data.type,
        description=data.description,
        item_description=data.item_description,
        expected_date=data.expected_date,
        status="pending",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    keys = _schema_keys(OrderResponse)
    out = {k: getattr(order, k) for k in keys if hasattr(order, k)}
    out["customer_name"] = customer.name
    return OrderResponse(**out)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    q = db.query(Order).filter(Order.id == order_id)
    q = apply_store_filter(q, Order, payload)
    if not q.first():
        raise HTTPException(status_code=404, detail="Order not found")
    keys = _schema_keys(OrderResponse)
    out = {k: getattr(order, k) for k in keys if hasattr(order, k)}
    out["customer_name"] = order.customer.name
    return OrderResponse(**out)


@router.patch("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    data: OrderUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    q = db.query(Order).filter(Order.id == order_id)
    q = apply_store_filter(q, Order, payload)
    if not q.first():
        raise HTTPException(status_code=404, detail="Order not found")
    if data.status is not None:
        if data.status not in STATUSES:
            raise HTTPException(status_code=400, detail=f"status must be one of {STATUSES}")
        order.status = data.status
        if data.status == "delivered":
            order.delivered_at = datetime.utcnow()
    if data.amount_charged is not None:
        order.amount_charged = data.amount_charged
    if data.description is not None:
        order.description = data.description
    if data.item_description is not None:
        order.item_description = data.item_description
    if data.expected_date is not None:
        order.expected_date = data.expected_date
    db.commit()
    db.refresh(order)
    keys = _schema_keys(OrderResponse)
    out = {k: getattr(order, k) for k in keys if hasattr(order, k)}
    out["customer_name"] = order.customer.name
    return OrderResponse(**out)
