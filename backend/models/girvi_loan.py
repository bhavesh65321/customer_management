from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base


class GirviLoan(Base):
    __tablename__ = "girvi_loans"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    jewelry_description = Column(String(500), nullable=False)
    gross_weight = Column(Float, nullable=True)
    purity = Column(Float, nullable=True)
    principal_amount = Column(Float, nullable=False)
    interest_rate_per_month = Column(Float, nullable=False)
    start_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="active")
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(String(500), nullable=True)

    customer = relationship("Customer", back_populates="girvi_loans")
    store = relationship("Store", back_populates="girvi_loans")
    photos = relationship("GirviPhoto", back_populates="loan", cascade="all, delete-orphan")
    interest_payments = relationship("GirviInterestPayment", back_populates="loan", cascade="all, delete-orphan")


class GirviPhoto(Base):
    __tablename__ = "girvi_photos"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("girvi_loans.id"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    loan = relationship("GirviLoan", back_populates="photos")


class GirviInterestPayment(Base):
    __tablename__ = "girvi_interest_payments"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("girvi_loans.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    for_month = Column(String(7), nullable=False)
    paid_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(String(255), nullable=True)

    loan = relationship("GirviLoan", back_populates="interest_payments")
