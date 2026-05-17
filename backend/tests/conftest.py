"""
conftest.py — shared pytest fixtures
======================================
Uses an in-memory SQLite database so tests never need a real MySQL server.
Every test gets a fresh DB session (transaction-rolled-back after each test).
"""

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# ── Force test environment BEFORE any app import ────────────────────────────
os.environ.setdefault("ENV", "test")
os.environ.setdefault("SECRET_KEY", "test_secret_key_for_pytest_only")
os.environ.setdefault("REFRESH_SECRET_KEY", "test_refresh_secret_key_for_pytest_only")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from config.database import Base, get_db  # noqa: E402
import models  # noqa: F401 — registers all ORM models with Base.metadata

# ── In-memory SQLite engine (shared per test session) ───────────────────────
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables once per test session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Clear the in-memory rate-limit store before every test."""
    from utils import rate_limit
    with rate_limit._lock:
        rate_limit._attempts.clear()
    yield
    with rate_limit._lock:
        rate_limit._attempts.clear()


@pytest.fixture()
def db():
    """
    Yield a DB session for a single test.
    Rolls back any changes after the test completes so tests are isolated.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    """
    FastAPI TestClient with the real app, but DB overridden to use the
    in-memory SQLite session.
    """
    from main import app

    def override_get_db():
        try:
            yield db
        finally:
            pass  # session lifecycle managed by `db` fixture

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


# ── Helper factories ─────────────────────────────────────────────────────────

def make_store(db, name="Test Jewellers", customer_code="TESTSTORE-001"):
    from models.store import Store
    store = Store(name=name, customer_code=customer_code, is_active=True)
    db.add(store)
    db.commit()
    db.refresh(store)
    return store


def make_user(db, email="admin@test.com", password="Admin123", role="admin", store_id=None):
    from models.user_model import User
    from utils.auth_utils import hash_password
    user = User(
        name="Test Admin",
        email=email,
        hashed_password=hash_password(password),
        role=role,
        is_active=True,
        store_id=store_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_auth_token(client, email="admin@test.com", password="Admin123"):
    """Log in and return the access token string."""
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    # login returns {"token": ..., "refresh_token": ...}
    return data.get("token") or data.get("access_token")


def auth_headers(client, email="admin@test.com", password="Admin123"):
    """Return Authorization header dict ready for use in requests."""
    token = get_auth_token(client, email, password)
    return {"Authorization": f"Bearer {token}"}
