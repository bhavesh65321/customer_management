from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base


class StockCategory(Base):
    __tablename__ = "stock_categories"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    name = Column(String(100), nullable=False)
    icon = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="stock_categories")
    items = relationship("StockItem", back_populates="category_obj")


class StockItem(Base):
    __tablename__ = "stock_items"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    category_id = Column(Integer, ForeignKey("stock_categories.id"), nullable=True)
    metal_type = Column(String(20), nullable=True)
    purity_percent = Column(Float, nullable=True)
    gross_weight_g = Column(Float, nullable=True)
    net_weight_g = Column(Float, nullable=True)
    huid = Column(String(50), nullable=True)
    stone_details = Column(String(255), nullable=True)
    making_charge_per_g = Column(Float, nullable=True)
    unit = Column(String(20), nullable=False, default="piece")
    min_quantity = Column(Float, nullable=True)
    reorder_weight_g = Column(Float, nullable=True)
    description = Column(String(500), nullable=True)
    unit_price = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    store = relationship("Store", back_populates="stock_items")
    category_obj = relationship("StockCategory", back_populates="items")
    movements = relationship("StockMovement", back_populates="item")


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("stock_items.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    movement_type = Column(String(30), nullable=False)
    movement_reason = Column(String(30), nullable=True)
    weight_g = Column(Float, nullable=True)
    rate_per_g = Column(Float, nullable=True)
    reference_id = Column(Integer, nullable=True)
    reference_type = Column(String(20), nullable=True)
    notes = Column(String(255), nullable=True)
    supplier_name = Column(String(255), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    item = relationship("StockItem", back_populates="movements")
