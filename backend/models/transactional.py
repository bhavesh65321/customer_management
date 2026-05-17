from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Boolean
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
    bill_type = Column(String(50), nullable=True)
    bill_photo_url = Column(String(500), nullable=True)

    # ── GST fields ────────────────────────────────────────────────────────
    # Set to True once GST is computed and stored; False = legacy bill
    gst_computed = Column(Boolean, default=False)
    hsn_code = Column(String(10), nullable=True)          # main item HSN  e.g. 7113
    making_hsn_code = Column(String(10), nullable=True)   # making charges HSN e.g. 9988
    tax_rate = Column(Float, default=3.0)
    making_tax_rate = Column(Float, default=5.0)
    taxable_value = Column(Float, default=0.0)            # item value excl. making
    making_charges = Column(Float, default=0.0)
    cgst_amount = Column(Float, default=0.0)
    sgst_amount = Column(Float, default=0.0)
    igst_amount = Column(Float, default=0.0)
    making_cgst = Column(Float, default=0.0)
    making_sgst = Column(Float, default=0.0)
    making_igst = Column(Float, default=0.0)
    is_interstate = Column(Boolean, default=False)
    customer_gstin = Column(String(15), nullable=True)
    invoice_prefix = Column(String(6), nullable=True)
    invoice_sequence = Column(Integer, nullable=True)
    invoice_number = Column(String(30), nullable=True, unique=True, index=True)

    customer = relationship("Customer", back_populates="transactions")
    store = relationship("Store", back_populates="transactions")
    transaction_lines = relationship("TransactionLine", back_populates="transaction")
    invoice = relationship("Invoice", back_populates="transaction", uselist=False)
    payments = relationship("Payment", back_populates="transaction")
    piece_lifecycle_events = relationship("PieceLifecycleEvent", back_populates="transaction")
