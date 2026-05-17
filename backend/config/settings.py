"""
Centralised application settings — loaded from environment variables.

Copy backend/.env.example → backend/.env and fill in real values.
Never hard-code secrets here. Never commit .env to git.
"""
import os
import warnings
from dotenv import load_dotenv

# Load .env from the backend directory (one level up from this file)
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_BASE_DIR, ".env"))

# ── Database ────────────────────────────────────────────────────────────────
DATABASE_URL: str = os.environ.get(
    "DATABASE_URL",
    "mysql+pymysql://root:root%40123@localhost:3306/customer_management_app",
)

# ── JWT ─────────────────────────────────────────────────────────────────────
# Generate via: python3 -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY: str = os.environ.get("SECRET_KEY", "dev_only_fallback_secret_key")
REFRESH_SECRET_KEY: str = os.environ.get(
    "REFRESH_SECRET_KEY", "dev_only_fallback_refresh_secret_key"
)
JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# ── Environment ──────────────────────────────────────────────────────────────
# Allowed values: development | staging | production
ENV: str = os.environ.get("ENV", "development").lower()
IS_PRODUCTION: bool = ENV in ("production", "prod")

# Security: raise hard error if running in production with default weak secrets
_WEAK_KEYS = {"dev_only_fallback_secret_key", "dev_only_fallback_refresh_secret_key", ""}
if IS_PRODUCTION:
    if SECRET_KEY in _WEAK_KEYS:
        raise RuntimeError(
            "FATAL: SECRET_KEY is not set or is using the dev fallback. "
            "Set a strong SECRET_KEY in your .env before running in production."
        )
    if REFRESH_SECRET_KEY in _WEAK_KEYS:
        raise RuntimeError(
            "FATAL: REFRESH_SECRET_KEY is not set or is using the dev fallback. "
            "Set a strong REFRESH_SECRET_KEY in your .env before running in production."
        )
elif SECRET_KEY in _WEAK_KEYS:
    warnings.warn(
        "SECRET_KEY is using the insecure dev fallback — never deploy this to production.",
        stacklevel=1,
    )

# ── CORS ─────────────────────────────────────────────────────────────────────
# Comma-separated list of allowed frontend origins.
_cors_raw: str = os.environ.get(
    "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)
CORS_ORIGINS: list[str] = [o.strip() for o in _cors_raw.split(",") if o.strip()]

# ── Redis (rate limiting) ─────────────────────────────────────────────────────
REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

# ── File storage ─────────────────────────────────────────────────────────────
UPLOAD_DIR: str = os.environ.get("UPLOAD_DIR", os.path.join(_BASE_DIR, "uploads"))

# ── Notifications (optional — app works without these) ───────────────────────
SMTP_HOST: str = os.environ.get("SMTP_HOST", "")
SMTP_PORT: int = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER: str = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD: str = os.environ.get("SMTP_PASSWORD", "")
FROM_EMAIL: str = os.environ.get("FROM_EMAIL", "")

TWILIO_ACCOUNT_SID: str = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN: str = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER: str = os.environ.get("TWILIO_FROM_NUMBER", "")
TWILIO_WHATSAPP_FROM: str = os.environ.get("TWILIO_WHATSAPP_FROM", "")

# ── AI ───────────────────────────────────────────────────────────────────────
OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL: str = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
AI_BUSINESS_REVIEW_ENABLED: bool = bool(os.environ.get("AI_BUSINESS_REVIEW_ENABLED", ""))
