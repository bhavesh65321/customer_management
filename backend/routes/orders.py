from datetime import datetime, timedelta, date
from math import ceil
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload

from config.database import get_db
from dependencies import require_staff
from core.db_filters import apply_store_filter, resolve_write_store_id
from models.order_repair import Order
from models.order_step import OrderStep
from models.workflow_template import WorkflowTemplate, WorkflowTemplateStep
from models.customer import Customer
from models.karigar import Karigar
from schemas.order_schema import OrderCreate, OrderUpdate, OrderResponse
from schemas.workflow_schema import OrderStepResponse, MarkStepDone
from utils.activity import log_activity
from services.order_notifications import (
    run_order_customer_notify_task,
    notify_customer_due_soon,
)

router = APIRouter(tags=["Orders & Repairs"])

ORDER_TYPES = ["new_order", "repair"]
STATUSES = ["pending", "in_progress", "ready", "delivered"]


def _order_to_response(order: Order) -> OrderResponse:
    steps = []
    for s in (order.order_steps or []):
        steps.append(OrderStepResponse(
            id=s.id,
            step_order=s.step_order,
            step_name=s.step_name,
            karigar_id=s.karigar_id,
            karigar_name=s.karigar.name if s.karigar else s.karigar_name,
            is_done=bool(s.is_done),
            is_bypassed=bool(s.is_bypassed),
            bypass_reason=s.bypass_reason,
            done_at=s.done_at,
            done_by=s.done_by,
            karigar_charge=s.karigar_charge,
            metal_loss_weight=s.metal_loss_weight,
        ).dict())
    return OrderResponse(
        id=order.id,
        store_id=order.store_id,
        customer_id=order.customer_id,
        type=order.type,
        description=order.description,
        item_description=order.item_description,
        expected_date=order.expected_date,
        status=order.status,
        delivered_at=order.delivered_at,
        amount_charged=order.amount_charged,
        karigar_id=getattr(order, "karigar_id", None),
        workflow_step=getattr(order, "workflow_step", None),
        workflow_template_id=getattr(order, "workflow_template_id", None),
        advance_cash=getattr(order, "advance_cash", None),
        advance_metal_weight=getattr(order, "advance_metal_weight", None),
        advance_metal_purity=getattr(order, "advance_metal_purity", None),
        advance_metal_type=getattr(order, "advance_metal_type", None),
        created_at=order.created_at,
        customer_name=order.customer.name if order.customer else None,
        karigar_name=order.karigar.name if getattr(order, "karigar", None) else None,
        order_steps=steps,
    )


def _orders_base_query(db: Session, payload: dict):
    q = (
        db.query(Order)
        .options(
            joinedload(Order.customer),
            joinedload(Order.karigar),
            joinedload(Order.order_steps).joinedload(OrderStep.karigar),
        )
        .join(Customer, Order.customer_id == Customer.id)
    )
    return apply_store_filter(q, Order, payload)


@router.get("/workflow-alerts")
def get_workflow_alerts(
    days_ahead: int = Query(3, ge=1, le=30),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
) -> Dict[str, Any]:
    today = datetime.utcnow().date()
    horizon = today + timedelta(days=days_ahead)

    def base():
        return _orders_base_query(db, payload)

    due_soon_not_started = (
        base()
        .filter(
            Order.status == "pending",
            Order.expected_date.isnot(None),
            Order.expected_date >= today,
            Order.expected_date <= horizon,
        )
        .order_by(Order.expected_date.asc())
        .all()
    )

    overdue_not_started = (
        base()
        .filter(
            Order.status == "pending",
            Order.expected_date.isnot(None),
            Order.expected_date < today,
        )
        .order_by(Order.expected_date.asc())
        .all()
    )

    overdue_in_progress = (
        base()
        .filter(
            Order.status == "in_progress",
            Order.expected_date.isnot(None),
            Order.expected_date < today,
        )
        .order_by(Order.expected_date.asc())
        .all()
    )

    return {
        "today": str(today),
        "days_ahead": days_ahead,
        "due_soon_not_started": [_order_to_response(r) for r in due_soon_not_started],
        "overdue_not_started": [_order_to_response(r) for r in overdue_not_started],
        "overdue_in_progress": [_order_to_response(r) for r in overdue_in_progress],
    }


@router.post("/send-due-reminders")
def send_due_reminders_to_customers(
    days_ahead: int = Query(3, ge=1, le=14),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
) -> Dict[str, Any]:
    today = datetime.utcnow().date()
    horizon = today + timedelta(days=days_ahead)
    q = _orders_base_query(db, payload)
    q = q.filter(Order.status == "pending", Order.expected_date.isnot(None))
    q = q.filter(Order.expected_date <= horizon)
    rows = q.order_by(Order.expected_date.asc()).all()
    for order in rows:
        overdue = bool(order.expected_date and order.expected_date < today)
        notify_customer_due_soon(db, order, overdue=overdue)
    return {
        "orders_notified": len(rows),
        "message": f"Due / upcoming reminders sent for {len(rows)} pending order(s).",
    }


@router.get("", response_model=list)
def list_orders(
    customer_id: Optional[int] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(0, ge=0, description="1-based page. 0 = all (legacy)"),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = _orders_base_query(db, payload)
    if customer_id is not None:
        q = q.filter(Order.customer_id == customer_id)
    if type:
        q = q.filter(Order.type == type)
    if status:
        q = q.filter(Order.status == status)
    q = q.order_by(Order.created_at.desc())

    total = q.count()

    if page > 0:
        rows = q.offset((page - 1) * page_size).limit(page_size).all()
        result = [_order_to_response(r) for r in rows]
        headers = {
            "X-Total-Count": str(total),
            "X-Page": str(page),
            "X-Page-Size": str(page_size),
            "X-Total-Pages": str(ceil(total / page_size) if total else 0),
            "Access-Control-Expose-Headers": "X-Total-Count, X-Page, X-Page-Size, X-Total-Pages",
        }
        return JSONResponse(content=result, headers=headers)

    rows = q.all()
    return [_order_to_response(r) for r in rows]


@router.post("", response_model=OrderResponse, status_code=201)
def create_order(
    data: OrderCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = resolve_write_store_id(payload, db, getattr(data, 'store_id', None))
    if data.type not in ORDER_TYPES:
        raise HTTPException(status_code=400, detail=f"type must be one of {ORDER_TYPES}")
    customer = (
        db.query(Customer)
        .filter(Customer.id == data.customer_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if data.karigar_id is not None:
        kg = (
            db.query(Karigar)
            .filter(Karigar.id == data.karigar_id, Karigar.store_id == store_id)
            .first()
        )
        if not kg:
            raise HTTPException(status_code=400, detail="Karigar not found for this store")
    order = Order(
        store_id=store_id,
        customer_id=data.customer_id,
        type=data.type,
        description=data.description,
        item_description=data.item_description,
        expected_date=data.expected_date,
        status="pending",
        karigar_id=data.karigar_id,
        workflow_step=data.workflow_step,
        workflow_template_id=data.workflow_template_id,
        advance_cash=data.advance_cash,
        advance_metal_weight=data.advance_metal_weight,
        advance_metal_purity=data.advance_metal_purity,
        advance_metal_type=data.advance_metal_type,
    )
    db.add(order)
    db.flush()

    # Create order steps from workflow template
    if data.workflow_template_id:
        tmpl = db.query(WorkflowTemplate).filter(
            WorkflowTemplate.id == data.workflow_template_id
        ).first()
        if tmpl:
            for s in tmpl.steps:
                kname = None
                if s.karigar_id:
                    kg = db.query(Karigar).filter(Karigar.id == s.karigar_id).first()
                    kname = kg.name if kg else None
                db.add(OrderStep(
                    order_id=order.id,
                    step_order=s.step_order,
                    step_name=s.step_name,
                    karigar_id=s.karigar_id,
                    karigar_name=kname,
                    is_done=False,
                    is_bypassed=False,
                ))

    db.commit()
    db.refresh(order)
    order = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.karigar))
        .filter(Order.id == order.id)
        .first()
    )
    cust_name = order.customer.name if order and order.customer else None
    type_label = "Repair" if order and order.type == "repair" else "New order"
    log_activity(
        db,
        payload,
        action="created",
        entity_type="order",
        entity_id=str(order.id),
        message=f"{type_label} for {cust_name or 'customer'} (#{order.id})",
        store_id=store_id,
    )
    background_tasks.add_task(run_order_customer_notify_task, order.id, "created", None, None)
    return _order_to_response(order)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    order = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.karigar))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    q = db.query(Order).filter(Order.id == order_id)
    q = apply_store_filter(q, Order, payload)
    if not q.first():
        raise HTTPException(status_code=404, detail="Order not found")
    return _order_to_response(order)


@router.patch("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    data: OrderUpdate,
    background_tasks: BackgroundTasks,
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

    old_status = order.status
    status_changed = False

    if data.status is not None:
        if data.status not in STATUSES:
            raise HTTPException(status_code=400, detail=f"status must be one of {STATUSES}")
        # Block backward status transitions once delivered
        STATUS_ORDER = {s: i for i, s in enumerate(STATUSES)}
        if old_status == "delivered" and data.status != "delivered":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot change status of a delivered order back to '{data.status}'"
            )
        if data.status != old_status:
            status_changed = True
        order.status = data.status
        if data.status == "delivered":
            if order.delivered_at is None:
                order.delivered_at = datetime.utcnow()
        else:
            order.delivered_at = None

    if data.amount_charged is not None:
        order.amount_charged = data.amount_charged
    if data.description is not None:
        order.description = data.description
    if data.item_description is not None:
        order.item_description = data.item_description
    if data.expected_date is not None:
        order.expected_date = data.expected_date
    patch = data.dict(exclude_unset=True)
    if "karigar_id" in patch:
        kid = patch["karigar_id"]
        if kid is None or kid == 0:
            order.karigar_id = None
        else:
            kg = (
                db.query(Karigar)
                .filter(Karigar.id == kid, Karigar.store_id == order.store_id)
                .first()
            )
            if not kg:
                raise HTTPException(status_code=400, detail="Karigar not found for this store")
            order.karigar_id = kid
    if "workflow_step" in patch:
        order.workflow_step = patch["workflow_step"]

    db.commit()
    order = (
        db.query(Order)
        .options(
            joinedload(Order.customer),
            joinedload(Order.karigar),
            joinedload(Order.order_steps).joinedload(OrderStep.karigar),
        )
        .filter(Order.id == order_id)
        .first()
    )
    type_label = "Repair" if order and order.type == "repair" else "Order"
    log_activity(
        db,
        payload,
        action="updated",
        entity_type="order",
        entity_id=str(order_id),
        message=f"Updated {type_label.lower()} (#{order_id})",
        store_id=order.store_id if order else None,
    )
    if status_changed and order:
        background_tasks.add_task(
            run_order_customer_notify_task,
            order_id,
            "status_changed",
            old_status,
            order.status,
        )
    return _order_to_response(order)


# ── Order Steps ──────────────────────────────────────────────────────────────

@router.get("/{order_id}/steps", response_model=List[OrderStepResponse])
def get_order_steps(
    order_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    steps = (
        db.query(OrderStep)
        .options(joinedload(OrderStep.karigar))
        .filter(OrderStep.order_id == order_id)
        .order_by(OrderStep.step_order)
        .all()
    )
    return [OrderStepResponse(
        id=s.id,
        step_order=s.step_order,
        step_name=s.step_name,
        karigar_id=s.karigar_id,
        karigar_name=s.karigar.name if s.karigar else s.karigar_name,
        is_done=bool(s.is_done),
        is_bypassed=bool(s.is_bypassed),
        bypass_reason=s.bypass_reason,
        done_at=s.done_at,
        done_by=s.done_by,
        karigar_charge=s.karigar_charge,
        metal_loss_weight=s.metal_loss_weight,
    ) for s in steps]


@router.post("/{order_id}/steps/{step_id}/done", response_model=OrderStepResponse)
def mark_step_done(
    order_id: int,
    step_id: int,
    data: MarkStepDone,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    step = (
        db.query(OrderStep)
        .options(joinedload(OrderStep.karigar))
        .filter(OrderStep.id == step_id, OrderStep.order_id == order_id)
        .first()
    )
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    actor = payload.get("sub") or payload.get("name") or "Staff"
    if data.bypass:
        step.is_bypassed = True
        step.bypass_reason = data.bypass_reason
        step.done_at = datetime.utcnow()
        step.done_by = actor
    else:
        step.is_done = True
        step.done_at = datetime.utcnow()
        step.done_by = actor
        step.karigar_charge = data.karigar_charge
        step.metal_loss_weight = data.metal_loss_weight
    db.commit()
    db.refresh(step)

    # Auto-advance: first step done → in_progress; all done → ready
    all_steps = db.query(OrderStep).filter(OrderStep.order_id == order_id).all()
    all_done = all(s.is_done or s.is_bypassed for s in all_steps)
    order = db.query(Order).filter(Order.id == order_id).first()
    if all_done and all_steps and order:
        if order.status in ("pending", "in_progress"):
            old_status = order.status
            order.status = "ready"
            db.commit()
            background_tasks.add_task(
                run_order_customer_notify_task, order_id, "status_changed", old_status, "ready"
            )
    elif order and order.status == "pending":
        order.status = "in_progress"
        db.commit()

    return OrderStepResponse(
        id=step.id,
        step_order=step.step_order,
        step_name=step.step_name,
        karigar_id=step.karigar_id,
        karigar_name=step.karigar.name if step.karigar else step.karigar_name,
        is_done=bool(step.is_done),
        is_bypassed=bool(step.is_bypassed),
        bypass_reason=step.bypass_reason,
        done_at=step.done_at,
        done_by=step.done_by,
        karigar_charge=step.karigar_charge,
        metal_loss_weight=step.metal_loss_weight,
    )
