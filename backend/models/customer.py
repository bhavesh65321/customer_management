from sqlalchemy import Column, Integer, String, Text, JSON
from sqlalchemy.orm import relationship
from config.database import Base


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    father_name = Column(String(255), nullable=True)
    primary_phone = Column(String(20), nullable=False)
    secondary_phone = Column(String(20), nullable=True)
    address = Column(String(500), nullable=True)
    city = Column(String(255), nullable=True)
    pincode = Column(String(10), nullable=True)
    gender = Column(String(10), nullable=True)
    country = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    pan_encrypted = Column(String(500), nullable=True)
    aadhaar_encrypted = Column(String(500), nullable=True)
    preferences = Column(JSON, nullable=True)

    transactions = relationship("Transaction", back_populates="customer")
    user = relationship("User", back_populates="customer", uselist=False)
    invites = relationship("CustomerInvite", back_populates="customer")
