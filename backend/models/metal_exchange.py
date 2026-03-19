from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base


class MetalExchange(Base):
    __tablename__ = "metal_exchanges"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    type = Column(String(30), nullable=False)
    metal_type = Column(String(20), nullable=True)
    raw_weight = Column(Float, nullable=True)
    raw_purity = Column(Float, nullable=True)
    pure_weight = Column(Float, nullable=True)
    cash_amount = Column(Float, nullable=True)
    making_charges = Column(Float, nullable=True)
    notes = Column(String(500), nullable=True)
    exchange_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="metal_exchanges")
    store = relationship("Store", back_populates="metal_exchanges")
