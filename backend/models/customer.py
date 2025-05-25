from sqlalchemy import Column, Integer, String
from config.database import Base
from sqlalchemy.orm import relationship

class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = {'extend_existing': True}  # <-- Add this line

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    father_name = Column(String(255))
    primary_phone = Column(String(20), nullable=False)
    secondary_phone = Column(String(20))
    address = Column(String(500))
    city = Column(String(255))
    pincode = Column(String(10))
    gender = Column(String(10))
    country = Column(String(255))
    email = Column(String(255))

    transactions = relationship("Transaction", back_populates="customer")
