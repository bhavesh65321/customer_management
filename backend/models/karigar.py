from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base


class Karigar(Base):
    __tablename__ = "karigars"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    rate_per_gram = Column(String(80), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    store = relationship("Store", back_populates="karigars")
    orders = relationship("Order", back_populates="karigar")
    lifecycle_events = relationship("PieceLifecycleEvent", back_populates="karigar")
    pieces = relationship("InventoryPiece", back_populates="karigar")
