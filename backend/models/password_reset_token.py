from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from datetime import datetime, timedelta
from config.database import Base


def _default_expires():
    return datetime.utcnow() + timedelta(hours=1)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, default=_default_expires)
    created_at = Column(DateTime, default=datetime.utcnow)
