from sqlalchemy import Column, Integer, String, Boolean, Date
from sqlalchemy.orm import relationship
from config.database import Base


class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    gstin = Column(String(20), nullable=True)
    bis_reg = Column(String(100), nullable=True)
    customer_code = Column(String(50), nullable=True, index=True)
    join_date = Column(Date, nullable=True)
    address = Column(String(500), nullable=True)
    location = Column(String(255), nullable=True)
    contact_phone = Column(String(20), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    license_type = Column(String(20), nullable=True)

    transactions = relationship("Transaction", back_populates="store")
    inventory_pieces = relationship("InventoryPiece", back_populates="store")
    users = relationship("User", back_populates="store")
