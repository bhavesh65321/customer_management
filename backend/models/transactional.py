from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    customer_name = Column(String(255), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    products = Column(JSON, nullable=True)
    paid_amount = Column(Float, default=0)
    due_amount = Column(Float, default=0)
    grand_total = Column(Float, default=0)
    date = Column(DateTime, default=datetime.utcnow)
    payment_mode = Column(String(50), nullable=True)

    customer = relationship("Customer", back_populates="transactions")
    store = relationship("Store", back_populates="transactions")
    transaction_lines = relationship("TransactionLine", back_populates="transaction")
    invoice = relationship("Invoice", back_populates="transaction", uselist=False)
