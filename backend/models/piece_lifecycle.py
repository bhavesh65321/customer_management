from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base


class PieceLifecycleEvent(Base):
    __tablename__ = "piece_lifecycle_events"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False, index=True)
    piece_id = Column(Integer, ForeignKey("inventory_pieces.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False, index=True)
    notes = Column(Text, nullable=True)
    payload = Column(JSON, nullable=True)
    karigar_id = Column(Integer, ForeignKey("karigars.id"), nullable=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    piece = relationship("InventoryPiece", back_populates="lifecycle_events")
    store = relationship("Store", back_populates="piece_lifecycle_events")
    karigar = relationship("Karigar", back_populates="lifecycle_events")
    order = relationship("Order", back_populates="piece_events")
    transaction = relationship("Transaction", back_populates="piece_lifecycle_events")
