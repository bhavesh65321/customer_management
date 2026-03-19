from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from datetime import datetime
from config.database import Base


class PaymentIdempotency(Base):
    __tablename__ = "payment_idempotency"

    idempotency_key = Column(String(64), primary_key=True)
    transaction_id = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False)
    response_snapshot = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
