from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base


class OrderStep(Base):
    __tablename__ = "order_steps"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    step_order = Column(Integer, nullable=False, default=0)
    step_name = Column(String(120), nullable=False)
    karigar_id = Column(Integer, ForeignKey("karigars.id"), nullable=True)
    karigar_name = Column(String(100), nullable=True)
    is_done = Column(Boolean, nullable=False, default=False)
    is_bypassed = Column(Boolean, nullable=False, default=False)
    bypass_reason = Column(String(200), nullable=True)
    done_at = Column(DateTime, nullable=True)
    done_by = Column(String(80), nullable=True)
    karigar_charge = Column(Float, nullable=True)
    metal_loss_weight = Column(Float, nullable=True)

    karigar = relationship("Karigar")
