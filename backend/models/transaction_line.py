from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from config.database import Base


class TransactionLine(Base):
    __tablename__ = "transaction_lines"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    piece_id = Column(Integer, ForeignKey("inventory_pieces.id"), nullable=True)
    product_name = Column(String(255), nullable=True)
    metal_type = Column(String(50), nullable=False)
    weight = Column(Float, nullable=False)
    rate = Column(Float, nullable=False)
    making_charge = Column(Float, default=0)
    diamond_charge = Column(Float, default=0)
    gst_percent = Column(Float, default=3)
    metal_value = Column(Float, nullable=True)
    gst_amount = Column(Float, nullable=True)
    total = Column(Float, nullable=True)

    transaction = relationship("Transaction", back_populates="transaction_lines")
    piece = relationship("InventoryPiece", back_populates="transaction_lines")
