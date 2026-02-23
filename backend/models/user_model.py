from sqlalchemy import Column, Integer, String, ForeignKey
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

    customer = relationship("Customer", back_populates="user", uselist=False)
    store = relationship("Store", back_populates="users")
