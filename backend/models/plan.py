"""
models/plan.py — Subscription plan / tier model (MON-01)

Plans define the feature limits each store is entitled to.
They are seeded once and referenced from the stores table.

Tiers:
  starter     ₹499/mo  — up to 200 customers, core billing only
  pro         ₹999/mo  — up to 2000 customers, girvi, analytics, GST
  enterprise  ₹2499/mo — unlimited, all features, priority support
  trial       free 14d — pro-level access, 100 customer cap
"""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from config.database import Base


class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)

    # Human-readable slug used in code — never changes once seeded
    name = Column(String(50), unique=True, nullable=False, index=True)
    # Display name shown to users
    display_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # Pricing (INR)
    price_monthly = Column(Float, default=0.0, nullable=False)
    price_yearly = Column(Float, default=0.0, nullable=True)

    # Hard limits — NULL means unlimited
    max_customers = Column(Integer, nullable=True)   # NULL = unlimited
    max_users = Column(Integer, nullable=True)        # NULL = unlimited
    max_stores = Column(Integer, default=1)

    # Feature flags
    has_girvi = Column(Boolean, default=False, nullable=False)
    has_gst_invoicing = Column(Boolean, default=True, nullable=False)
    has_analytics = Column(Boolean, default=False, nullable=False)
    has_metal_exchange = Column(Boolean, default=False, nullable=False)
    has_inventory = Column(Boolean, default=False, nullable=False)
    has_whatsapp = Column(Boolean, default=False, nullable=False)
    has_bulk_import = Column(Boolean, default=False, nullable=False)
    has_reports_export = Column(Boolean, default=False, nullable=False)
    has_api_access = Column(Boolean, default=False, nullable=False)

    # Lifecycle
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Back-reference
    stores = relationship("Store", back_populates="plan")


class StoreSubscription(Base):
    """
    Tracks every subscription event for a store — one row per billing cycle.
    The current active subscription is the latest row with status='active'.
    """
    __tablename__ = "store_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)

    # Payment gateway reference
    gateway = Column(String(30), default="razorpay")        # "razorpay" | "stripe" | "manual"
    gateway_subscription_id = Column(String(200), nullable=True, index=True)
    gateway_customer_id = Column(String(200), nullable=True)
    gateway_order_id = Column(String(200), nullable=True)
    gateway_payment_id = Column(String(200), nullable=True)

    # Billing cycle
    status = Column(String(20), default="pending")
    # status values: pending | active | past_due | cancelled | expired | paused
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    # Amount actually charged
    amount_paid = Column(Float, nullable=True)
    currency = Column(String(5), default="INR")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    store = relationship("Store", back_populates="subscriptions")
    plan = relationship("Plan")
