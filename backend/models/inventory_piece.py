from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base


class InventoryPiece(Base):
    __tablename__ = "inventory_pieces"

    id = Column(Integer, primary_key=True, index=True)
    serial = Column(String(100), unique=True, nullable=False, index=True)
    huid = Column(String(20), nullable=True, index=True)
    metal_type = Column(String(50), nullable=False)
    gross_weight = Column(Float, nullable=False)
    net_weight = Column(Float, nullable=False)
    purity = Column(Float, nullable=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    certificate_ref = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    store = relationship("Store", back_populates="inventory_pieces")
    transaction_lines = relationship("TransactionLine", back_populates="piece")
