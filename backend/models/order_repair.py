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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="orders")
    store = relationship("Store", back_populates="orders")
