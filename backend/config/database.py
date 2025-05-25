from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import pymysql

# Use this connection format instead
DATABASE_URL = "mysql+pymysql://root:123456789@localhost:3306/customer_manage"

# Create engine with corrected connection arguments
engine = create_engine(
    DATABASE_URL,
    connect_args={
        "ssl": {"ssl_disabled": True}  # Only if you don't need SSL
    },
    pool_pre_ping=True,
    pool_recycle=3600
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()