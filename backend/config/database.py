import os
import logging
from urllib.parse import urlparse, urlunparse

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

DEFAULT_DATABASE_URL = "mysql+pymysql://root:root%40123@localhost:3306/customer_management_app"


def _build_proxy_database_url(raw_url: str, proxy_host: str, proxy_port: int) -> str:
    parsed = urlparse(raw_url)
    if not parsed.hostname:
        return raw_url

    user_info = ""
    if parsed.username:
        user_info = parsed.username
        if parsed.password:
            user_info += f":{parsed.password}"
        user_info += "@"

    new_netloc = f"{user_info}{proxy_host}:{proxy_port}"
    new_parsed = parsed._replace(netloc=new_netloc)
    return urlunparse(new_parsed)


def _resolve_database_url() -> str:
    raw_url = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
    proxy_url = os.getenv("DATABASE_PROXY_URL") or os.getenv("RAILWAY_PROXY_URL")
    proxy_host = os.getenv("DATABASE_PROXY_HOST")
    proxy_port = os.getenv("DATABASE_PROXY_PORT")

    if proxy_url:
        if ":" in proxy_url:
            proxy_host, proxy_port_str = proxy_url.split(":", 1)
            proxy_port = proxy_port or proxy_port_str
        else:
            proxy_port = proxy_port or "3306"

    if proxy_host and proxy_port and raw_url.startswith("mysql") and "railway.app" in raw_url:
        try:
            parsed_port = int(proxy_port)
        except ValueError:
            logger.warning("Invalid DATABASE_PROXY_PORT or RAILWAY_PROXY_URL port: %s", proxy_port)
            parsed_port = 3306
        fallback = _build_proxy_database_url(raw_url, proxy_host, parsed_port)
        logger.info(
            "Detected Railway direct DB host, rewriting to public proxy %s:%s",
            proxy_host,
            parsed_port,
        )
        return fallback

    if raw_url.startswith("mysql") and "railway.app" in raw_url:
        logger.warning(
            "Detected Railway direct DB host in DATABASE_URL; "
            "if running outside Railway, set DATABASE_PROXY_URL or RAILWAY_PROXY_URL to the public proxy host:port."
        )

    return raw_url


DATABASE_URL = _resolve_database_url()

if DATABASE_URL:
    display_value = DATABASE_URL
    if "@" in DATABASE_URL:
        display_value = DATABASE_URL.split("@", 1)[1]
    logger.info("Database URL host: %s", display_value)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    connect_args={
        "connect_timeout": 15,
        "read_timeout": 30,
        "write_timeout": 30,
        "charset": "utf8mb4",
        "autocommit": False,
    },
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
