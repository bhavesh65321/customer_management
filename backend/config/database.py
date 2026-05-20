import os

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,    # recycle connections before MySQL server-side timeout
    pool_size=10,         # number of persistent connections
    max_overflow=20,      # additional connections beyond pool_size
    pool_timeout=30,      # seconds to wait for connection from pool
    connect_args={
        # PyMySQL-specific connection timeouts (seconds)
        "connect_timeout": 10,
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