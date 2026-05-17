from sqlalchemy import Boolean, Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from config.database import Base

# Valid roles (ordered by privilege: highest → lowest)
# superadmin = platform/SaaS owner (sees ALL stores on the platform)
# admin      = store owner / company admin (sees ONLY their own store)
# manager    > staff > customer
VALID_ROLES = ("superadmin", "admin", "manager", "staff", "customer")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=True)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(200))
    role = Column(String(20), nullable=False, default="staff")
    is_active = Column(Boolean, nullable=False, default=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    designation = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(500), nullable=True)
    monthly_pay = Column(Float, nullable=True)
    join_date = Column(Date, nullable=True)

    # ── 2-Factor Authentication ─────────────────────────────────────────────
    # Opt-in per user. Default False — all existing users are unaffected.
    two_fa_enabled = Column(Boolean, nullable=False, default=False, server_default="0")

    customer = relationship("Customer", back_populates="user", uselist=False)
    store = relationship("Store", back_populates="users")
