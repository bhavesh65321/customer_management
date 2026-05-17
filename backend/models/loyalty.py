"""
models/loyalty.py — FEAT-05: Customer Loyalty Points

Points are earned per transaction (configurable rate per store) and can be
redeemed as a discount. Points never expire unless explicitly zeroed out.

Tables:
  loyalty_configs   — per-store configuration (points per ₹1000, redemption value)
  loyalty_ledger    — immutable append-only log of every earn/redeem/adjust event

Balance is computed as SUM(points) over the ledger — no denormalized balance
column to avoid drift.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Column, DateTime, Enum, ForeignKey, Index, Integer, Numeric, String, Text
)
from sqlalchemy.orm import relationship

from config.database import Base


class LoyaltyConfig(Base):
    """Per-store loyalty programme settings."""
    __tablename__ = "loyalty_configs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False, unique=True, index=True)

    # How many points earned per ₹1000 spent (default: 10)
    points_per_1000 = Column(Numeric(10, 2), nullable=False, default=10)
    # How much (in ₹) is 1 point worth when redeeming (default: ₹0.50)
    rupee_value_per_point = Column(Numeric(10, 4), nullable=False, default=0.50)
    # Minimum points required to redeem (default: 100)
    min_redeem_points = Column(Integer, nullable=False, default=100)
    # Max % of bill that can be paid via points (default: 20%)
    max_redeem_pct = Column(Numeric(5, 2), nullable=False, default=20.0)

    is_active = Column(Integer, nullable=False, default=1)  # 1=active, 0=paused
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    store = relationship("Store", foreign_keys=[store_id])


class LoyaltyLedger(Base):
    """Immutable ledger of all loyalty point events per customer."""
    __tablename__ = "loyalty_ledger"
    __table_args__ = (
        Index("ix_loyalty_ledger_customer_store", "customer_id", "store_id"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)

    # Positive = earned, negative = redeemed/adjusted
    points = Column(Integer, nullable=False)

    event_type = Column(
        Enum("earn", "redeem", "adjust", "expire", name="loyalty_event_type"),
        nullable=False,
    )
    # Optional link to the transaction that caused this event
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # staff who made adj

    customer = relationship("Customer", foreign_keys=[customer_id])
    store = relationship("Store", foreign_keys=[store_id])
