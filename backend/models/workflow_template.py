from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base


class WorkflowTemplate(Base):
    __tablename__ = "workflow_templates"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    order_type = Column(String(20), nullable=False, default="both")  # new_order / repair / both
    created_at = Column(DateTime, default=datetime.utcnow)

    steps = relationship("WorkflowTemplateStep", back_populates="template",
                         order_by="WorkflowTemplateStep.step_order", cascade="all, delete-orphan")


class WorkflowTemplateStep(Base):
    __tablename__ = "workflow_template_steps"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("workflow_templates.id"), nullable=False, index=True)
    step_order = Column(Integer, nullable=False, default=0)
    step_name = Column(String(120), nullable=False)
    karigar_id = Column(Integer, ForeignKey("karigars.id"), nullable=True)

    template = relationship("WorkflowTemplate", back_populates="steps")
    karigar = relationship("Karigar")
