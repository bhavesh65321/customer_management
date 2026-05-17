from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base


class InventoryPiece(Base):
    __tablename__ = "inventory_pieces"

    id = Column(Integer, primary_key=True, index=True)
    # Display name (new — simpler than serial for staff)
    name = Column(String(200), nullable=True)
    category = Column(String(100), nullable=True)
    serial = Column(String(100), unique=True, nullable=False, index=True)
    huid = Column(String(20), nullable=True, index=True)
    metal_type = Column(String(50), nullable=False)
    gross_weight = Column(Float, nullable=False)
    net_weight = Column(Float, nullable=False)
    purity = Column(Float, nullable=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    certificate_ref = Column(String(255), nullable=True)
    stone_weight_carat = Column(Float, nullable=True)
    stone_type = Column(String(100), nullable=True)
    stone_details = Column(String(200), nullable=True)
    making_charge_per_g = Column(Float, nullable=True)
    wastage_pct = Column(Float, nullable=True)
    location_bin = Column(String(80), nullable=True)
    design_sku = Column(String(100), nullable=True)
    photo_url = Column(String(500), nullable=True)
    # Status: in_stock | with_karigar | on_hold | sold
    status = Column(String(30), nullable=False, default="in_stock")
    notes = Column(Text, nullable=True)
    # Karigar assignment
    karigar_id = Column(Integer, ForeignKey("karigars.id"), nullable=True)
    given_to_karigar_on = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    store = relationship("Store", back_populates="inventory_pieces")
    karigar = relationship("Karigar", back_populates="pieces")
    transaction_lines = relationship("TransactionLine", back_populates="piece")
    lifecycle_events = relationship(
        "PieceLifecycleEvent",
        back_populates="piece",
        cascade="all, delete-orphan",
    )
