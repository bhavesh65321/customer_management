import os
import logging

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

# Log the DATABASE_URL being used (without password)
if DATABASE_URL:
    safe_url = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL
    logger.info(f"Connecting to database: {safe_url}")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,    # recycle connections before MySQL server-side timeout
    pool_size=5,          # reduced from 10 to avoid overwhelming Railway proxy
    max_overflow=10,      # reduced from 20
    pool_timeout=30,      # seconds to wait for connection from pool
    connect_args={
        # PyMySQL-specific connection timeouts (seconds)
        "connect_timeout": 15,  # increased from 10 to allow DNS resolution time
        "read_timeout": 30,
        "write_timeout": 30,
        # ensure proper utf8 handling
        "charset": "utf8mb4",
        "autocommit": False,
    },
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
