from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from config.database import Base


class MetalRate(Base):
    __tablename__ = "metal_rates"

    id = Column(Integer, primary_key=True, index=True)
    metal_type = Column(String(50), nullable=False, index=True)
    rate_per_unit = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False, default="gram")
    effective_from = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
