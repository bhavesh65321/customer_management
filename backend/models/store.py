from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from config.database import Base
from datetime import datetime, timedelta


class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    gstin = Column(String(20), nullable=True)
    bis_reg = Column(String(100), nullable=True)
    # Unique Company ID shared with staff/managers for self-registration
    customer_code = Column(String(50), nullable=True, unique=True, index=True)
    join_date = Column(Date, nullable=True)
    license_expiry = Column(Date, nullable=True)
    address = Column(String(500), nullable=True)
    location = Column(String(255), nullable=True)
    contact_phone = Column(String(20), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    license_type = Column(String(20), nullable=True)
    logo_url = Column(String(500), nullable=True)
    # Store owner / primary contact info (optional, for reference)
    owner_name = Column(String(150), nullable=True)
    owner_email = Column(String(150), nullable=True)

    # ── GST Configuration ──────────────────────────────────────────────────
    state_code = Column(String(3), nullable=True)               # e.g. "27" Maharashtra
    invoice_prefix = Column(String(6), nullable=True)           # e.g. "GP"
    invoice_seq_current = Column(Integer, default=0)            # last used sequence number
    default_hsn_gold = Column(String(10), default="7113")
    default_hsn_silver = Column(String(10), default="7114")
    default_hsn_making = Column(String(10), default="9988")
    default_hsn_diamond = Column(String(10), default="7102")

    # ── Subscription / Plan (MON-01) ───────────────────────────────────────
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=True, index=True)
    # trial | active | past_due | cancelled | suspended
    subscription_status = Column(String(20), default="trial", nullable=False)
    trial_ends_at = Column(DateTime, nullable=True)             # NULL = no trial limit
    subscribed_at = Column(DateTime, nullable=True)             # when paid sub started
    razorpay_customer_id = Column(String(200), nullable=True)   # Razorpay customer ID

    # ── Relationships ──────────────────────────────────────────────────────
    plan = relationship("Plan", back_populates="stores")
    subscriptions = relationship("StoreSubscription", back_populates="store",
                                 order_by="StoreSubscription.created_at.desc()")

    transactions = relationship("Transaction", back_populates="store")
    inventory_pieces = relationship("InventoryPiece", back_populates="store")
    users = relationship("User", back_populates="store")
    payments = relationship("Payment", back_populates="store")
    girvi_loans = relationship("GirviLoan", back_populates="store")
    metal_exchanges = relationship("MetalExchange", back_populates="store")
    orders = relationship("Order", back_populates="store")
    stock_items = relationship("StockItem", back_populates="store")
    stock_categories = relationship("StockCategory", back_populates="store")
    karigars = relationship("Karigar", back_populates="store")
    piece_lifecycle_events = relationship("PieceLifecycleEvent", back_populates="store")

    # ── Helpers ────────────────────────────────────────────────────────────
    @property
    def is_trial_expired(self) -> bool:
        if self.subscription_status != "trial":
            return False
        if self.trial_ends_at is None:
            return False
        return datetime.utcnow() > self.trial_ends_at

    @property
    def is_subscription_active(self) -> bool:
        return self.subscription_status in ("trial", "active") and not self.is_trial_expired
