from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from config.database import get_db
from dependencies import require_staff
from core.db_filters import apply_store_filter
from models.workflow_template import WorkflowTemplate, WorkflowTemplateStep
from models.karigar import Karigar
from schemas.workflow_schema import (
    WorkflowTemplateCreate,
    WorkflowTemplateUpdate,
    WorkflowTemplateResponse,
    WorkflowStepResponse,
)

router = APIRouter(tags=["Workflow Templates"])


def _template_to_response(t: WorkflowTemplate) -> WorkflowTemplateResponse:
    steps = []
    for s in t.steps:
        karigar_name = s.karigar.name if s.karigar else None
        steps.append(WorkflowStepResponse(
            id=s.id,
            step_order=s.step_order,
            step_name=s.step_name,
            karigar_id=s.karigar_id,
            karigar_name=karigar_name,
        ))
    return WorkflowTemplateResponse(
        id=t.id,
        store_id=t.store_id,
        name=t.name,
        order_type=t.order_type,
        created_at=t.created_at,
        steps=steps,
    )


@router.get("", response_model=List[WorkflowTemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(WorkflowTemplate).options(
        joinedload(WorkflowTemplate.steps).joinedload(WorkflowTemplateStep.karigar)
    )
    q = apply_store_filter(q, WorkflowTemplate, payload)
    rows = q.order_by(WorkflowTemplate.name).all()
    return [_template_to_response(r) for r in rows]


@router.post("", response_model=WorkflowTemplateResponse)
def create_template(
    data: WorkflowTemplateCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = payload.get("store_id")
    if not store_id:
        raise HTTPException(status_code=403, detail="Store required")
    t = WorkflowTemplate(store_id=store_id, name=data.name, order_type=data.order_type)
    db.add(t)
    db.flush()
    for i, step in enumerate(data.steps):
        db.add(WorkflowTemplateStep(
            template_id=t.id,
            step_order=step.step_order if step.step_order is not None else i,
            step_name=step.step_name,
            karigar_id=step.karigar_id,
        ))
    db.commit()
    db.refresh(t)
    t = db.query(WorkflowTemplate).options(
        joinedload(WorkflowTemplate.steps).joinedload(WorkflowTemplateStep.karigar)
    ).filter(WorkflowTemplate.id == t.id).first()
    return _template_to_response(t)


@router.get("/{template_id}", response_model=WorkflowTemplateResponse)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    t = db.query(WorkflowTemplate).options(
        joinedload(WorkflowTemplate.steps).joinedload(WorkflowTemplateStep.karigar)
    ).filter(WorkflowTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return _template_to_response(t)


@router.put("/{template_id}", response_model=WorkflowTemplateResponse)
def update_template(
    template_id: int,
    data: WorkflowTemplateUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    t = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    if data.name is not None:
        t.name = data.name
    if data.order_type is not None:
        t.order_type = data.order_type
    if data.steps is not None:
        # Replace all steps
        for old in list(t.steps):
            db.delete(old)
        db.flush()
        for i, step in enumerate(data.steps):
            db.add(WorkflowTemplateStep(
                template_id=t.id,
                step_order=step.step_order if step.step_order is not None else i,
                step_name=step.step_name,
                karigar_id=step.karigar_id,
            ))
    db.commit()
    t = db.query(WorkflowTemplate).options(
        joinedload(WorkflowTemplate.steps).joinedload(WorkflowTemplateStep.karigar)
    ).filter(WorkflowTemplate.id == template_id).first()
    return _template_to_response(t)


@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    t = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(t)
    db.commit()
    return {"ok": True}
