from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from config.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=True)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(200))
    role = Column(String(20), nullable=False, default="staff")
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    designation = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(500), nullable=True)
    monthly_pay = Column(Float, nullable=True)
    join_date = Column(Date, nullable=True)

    customer = relationship("Customer", back_populates="user", uselist=False)
    store = relationship("Store", back_populates="users")
