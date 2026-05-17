"""
OtpToken — stores short-lived 6-digit OTPs used for 2-Factor Authentication.

Flow:
  1. User logs in → if two_fa_enabled → OTP generated → stored here → returned to frontend via email
  2. Frontend submits OTP + temp_token → validated here → full JWT issued
  3. Row is marked used_at immediately after verification (single-use)
  4. Expired rows are cleaned up on each new OTP insert for the same user
"""
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from config.database import Base


class OtpToken(Base):
    __tablename__ = "otp_tokens"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    otp_code   = Column(String(10), nullable=False)          # 6-digit code
    temp_token = Column(String(512), nullable=False, index=True)  # short-lived JWT (type=2fa_pending)
    expires_at = Column(DateTime, nullable=False)
    used_at    = Column(DateTime, nullable=True)              # NULL = not yet used
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
