from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class WorkflowStepCreate(BaseModel):
    step_order: int
    step_name: str
    karigar_id: Optional[int] = None


class WorkflowStepResponse(BaseModel):
    id: int
    step_order: int
    step_name: str
    karigar_id: Optional[int] = None
    karigar_name: Optional[str] = None

    class Config:
        from_attributes = True


class WorkflowTemplateCreate(BaseModel):
    name: str
    order_type: str = "both"  # new_order / repair / both
    steps: List[WorkflowStepCreate] = []


class WorkflowTemplateUpdate(BaseModel):
    name: Optional[str] = None
    order_type: Optional[str] = None
    steps: Optional[List[WorkflowStepCreate]] = None


class WorkflowTemplateResponse(BaseModel):
    id: int
    store_id: int
    name: str
    order_type: str
    created_at: Optional[datetime] = None
    steps: List[WorkflowStepResponse] = []

    class Config:
        from_attributes = True


# Order step schemas
class OrderStepResponse(BaseModel):
    id: int
    step_order: int
    step_name: str
    karigar_id: Optional[int] = None
    karigar_name: Optional[str] = None
    is_done: bool
    is_bypassed: bool
    bypass_reason: Optional[str] = None
    done_at: Optional[datetime] = None
    done_by: Optional[str] = None
    karigar_charge: Optional[float] = None
    metal_loss_weight: Optional[float] = None

    class Config:
        from_attributes = True


class MarkStepDone(BaseModel):
    bypass: bool = False
    bypass_reason: Optional[str] = None
    karigar_charge: Optional[float] = None
    metal_loss_weight: Optional[float] = None
