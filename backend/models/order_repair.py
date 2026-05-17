from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    type = Column(String(20), nullable=False)
    description = Column(String(500), nullable=True)
    item_description = Column(String(500), nullable=True)
    expected_date = Column(Date, nullable=True)
    status = Column(String(30), nullable=False, default="pending")
    delivered_at = Column(DateTime, nullable=True)
    amount_charged = Column(Float, nullable=True)
    karigar_id = Column(Integer, ForeignKey("karigars.id"), nullable=True, index=True)
    workflow_step = Column(String(80), nullable=True)
    # Workflow template reference
    workflow_template_id = Column(Integer, ForeignKey("workflow_templates.id"), nullable=True)
    # Advance received at order time
    advance_cash = Column(Float, nullable=True)
    advance_metal_weight = Column(Float, nullable=True)
    advance_metal_purity = Column(Float, nullable=True)
    advance_metal_type = Column(String(20), nullable=True)  # gold / silver
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="orders")
    store = relationship("Store", back_populates="orders")
    karigar = relationship("Karigar", back_populates="orders")
    piece_events = relationship("PieceLifecycleEvent", back_populates="order")
    order_steps = relationship("OrderStep", foreign_keys="OrderStep.order_id",
                               primaryjoin="Order.id == OrderStep.order_id",
                               order_by="OrderStep.step_order", cascade="all, delete-orphan")
