"""
Centralised application settings — loaded from environment variables.

Local Development:
- Uses backend/.env

Railway Production:
- Uses Railway environment variables automatically
"""

import os
import warnings
from dotenv import load_dotenv

# ─────────────────────────────────────────────────────────────────────────────
# Base directory
# ─────────────────────────────────────────────────────────────────────────────
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ─────────────────────────────────────────────────────────────────────────────
# Load .env ONLY in local development
# IMPORTANT:
# Railway already injects environment variables.
# Loading local .env in production can overwrite Railway variables.
# ─────────────────────────────────────────────────────────────────────────────
if os.getenv("RAILWAY_ENVIRONMENT") is None:
    load_dotenv(os.path.join(_BASE_DIR, ".env"))

# ─────────────────────────────────────────────────────────────────────────────
# Environment
# ─────────────────────────────────────────────────────────────────────────────
ENV: str = os.environ.get("ENV", "development").lower()
IS_PRODUCTION: bool = ENV in ("production", "prod")

# ─────────────────────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────────────────────
DATABASE_URL: str = os.environ.get(
    "DATABASE_URL",
    "mysql+pymysql://root:root%40123@localhost:3306/customer_management_app",
)

# Safety check for production
if IS_PRODUCTION and "localhost" in DATABASE_URL:
    raise RuntimeError(
        "FATAL: DATABASE_URL is using localhost in production. "
        "Use Railway internal MySQL URL instead."
    )

# Temporary debug log (REMOVE LATER)
print("DATABASE_URL LOADED:", DATABASE_URL)

# ─────────────────────────────────────────────────────────────────────────────
# JWT
# ─────────────────────────────────────────────────────────────────────────────
SECRET_KEY: str = os.environ.get(
    "SECRET_KEY",
    "dev_only_fallback_secret_key"
)

REFRESH_SECRET_KEY: str = os.environ.get(
    "REFRESH_SECRET_KEY",
    "dev_only_fallback_refresh_secret_key"
)

JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")

ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

REFRESH_TOKEN_EXPIRE_DAYS: int = int(
    os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7")
)

# ─────────────────────────────────────────────────────────────────────────────
# Production security checks
# ─────────────────────────────────────────────────────────────────────────────
_WEAK_KEYS = {
    "dev_only_fallback_secret_key",
    "dev_only_fallback_refresh_secret_key",
    "",
}

if IS_PRODUCTION:
    if SECRET_KEY in _WEAK_KEYS:
        raise RuntimeError(
            "FATAL: SECRET_KEY is missing or using fallback value."
        )

    if REFRESH_SECRET_KEY in _WEAK_KEYS:
        raise RuntimeError(
            "FATAL: REFRESH_SECRET_KEY is missing or using fallback value."
        )

elif SECRET_KEY in _WEAK_KEYS:
    warnings.warn(
        "SECRET_KEY is using insecure development fallback.",
        stacklevel=1,
    )

# ─────────────────────────────────────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────────────────────────────────────
_cors_raw: str = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
)

CORS_ORIGINS: list[str] = [
    origin.strip()
    for origin in _cors_raw.split(",")
    if origin.strip()
]

# ─────────────────────────────────────────────────────────────────────────────
# Redis
# ─────────────────────────────────────────────────────────────────────────────
REDIS_URL: str = os.environ.get(
    "REDIS_URL",
    "redis://localhost:6379/0"
)

# ─────────────────────────────────────────────────────────────────────────────
# Uploads
# ─────────────────────────────────────────────────────────────────────────────
UPLOAD_DIR: str = os.environ.get(
    "UPLOAD_DIR",
    os.path.join(_BASE_DIR, "uploads")
)

# ─────────────────────────────────────────────────────────────────────────────
# Email / Notifications
# ─────────────────────────────────────────────────────────────────────────────
SMTP_HOST: str = os.environ.get("SMTP_HOST", "")
SMTP_PORT: int = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER: str = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD: str = os.environ.get("SMTP_PASSWORD", "")
FROM_EMAIL: str = os.environ.get("FROM_EMAIL", "")

# ─────────────────────────────────────────────────────────────────────────────
# Twilio
# ─────────────────────────────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID: str = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN: str = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER: str = os.environ.get("TWILIO_FROM_NUMBER", "")
TWILIO_WHATSAPP_FROM: str = os.environ.get("TWILIO_WHATSAPP_FROM", "")

# ─────────────────────────────────────────────────────────────────────────────
# AI
# ─────────────────────────────────────────────────────────────────────────────
OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL: str = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

AI_BUSINESS_REVIEW_ENABLED: bool = bool(
    os.environ.get("AI_BUSINESS_REVIEW_ENABLED", "")
)

# ─────────────────────────────────────────────────────────────────────────────
# Startup logs
# ─────────────────────────────────────────────────────────────────────────────
print(f"Environment: {ENV}")
print("Settings loaded successfully")