"""
tests/test_auth.py
==================
Tests for authentication endpoints:
  POST /api/auth/register
  POST /api/auth/login
  GET  /api/auth/companies
  POST /api/auth/refresh
  GET  /api/auth/me
  hecking build is latest
"""

import pytest
from tests.conftest import make_store, make_user, auth_headers


# ─────────────────────────────────────────────────────────────────────────────
# /api/auth/companies
# ─────────────────────────────────────────────────────────────────────────────

class TestListCompanies:
    def test_returns_empty_when_no_stores(self, client):
        resp = client.get("/api/auth/companies")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_active_stores_only(self, client, db):
        from models.store import Store
        active = Store(name="Active Store", customer_code="ACT-001", is_active=True)
        inactive = Store(name="Inactive Store", customer_code="INA-001", is_active=False)
        db.add_all([active, inactive])
        db.commit()
        resp = client.get("/api/auth/companies")
        assert resp.status_code == 200
        names = [s["name"] for s in resp.json()]
        assert "Active Store" in names
        assert "Inactive Store" not in names


# ─────────────────────────────────────────────────────────────────────────────
# /api/auth/register
# ─────────────────────────────────────────────────────────────────────────────

class TestRegister:
    def test_first_user_becomes_admin(self, client, db):
        resp = client.post("/api/auth/register", json={
            "name": "First User",
            "email": "first@test.com",
            "password": "Secret123",
        })
        assert resp.status_code == 200
        from models.user_model import User
        user = db.query(User).filter(User.email == "first@test.com").first()
        assert user is not None
        assert user.role == "admin"

    def test_duplicate_email_returns_400(self, client, db):
        make_user(db, email="dup@test.com")
        resp = client.post("/api/auth/register", json={
            "name": "Dup",
            "email": "dup@test.com",
            "password": "Secret123",
        })
        assert resp.status_code == 400
        assert "already registered" in resp.json()["error"]["message"].lower()

    def test_weak_password_too_short(self, client):
        resp = client.post("/api/auth/register", json={
            "name": "Weak",
            "email": "weak@test.com",
            "password": "abc",
        })
        # Pydantic min_length=8 returns 422; controller check returns 400
        assert resp.status_code in (400, 422)

    def test_weak_password_no_number(self, client):
        resp = client.post("/api/auth/register", json={
            "name": "Weak",
            "email": "weak2@test.com",
            "password": "NoNumbers",
        })
        assert resp.status_code == 400

    def test_weak_password_no_letter(self, client):
        resp = client.post("/api/auth/register", json={
            "name": "Weak",
            "email": "weak3@test.com",
            "password": "12345678",
        })
        assert resp.status_code == 400

    def test_register_with_valid_company_code(self, client, db):
        store = make_store(db, name="Gold Palace", customer_code="GOLDPAL-001")
        resp = client.post("/api/auth/register", json={
            "name": "Staff User",
            "email": "staff@test.com",
            "password": "Staff123",
            "company_identifier": "GOLDPAL-001",
        })
        assert resp.status_code == 200

    def test_register_with_invalid_company_code_returns_400(self, client):
        resp = client.post("/api/auth/register", json={
            "name": "Nobody",
            "email": "nobody@test.com",
            "password": "Nobody123",
            "company_identifier": "DOESNOTEXIST",
        })
        assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# /api/auth/login
# ─────────────────────────────────────────────────────────────────────────────

class TestLogin:
    def test_valid_credentials_return_access_token(self, client, db):
        make_user(db, email="login@test.com", password="Login123", role="admin")
        resp = client.post("/api/auth/login", json={
            "email": "login@test.com",
            "password": "Login123",
        })
        assert resp.status_code == 200
        data = resp.json()
        # login returns {"token": ..., "refresh_token": ...}
        assert "token" in data
        assert "refresh_token" in data

    def test_wrong_password_returns_401(self, client, db):
        make_user(db, email="wrongpw@test.com", password="Correct123")
        resp = client.post("/api/auth/login", json={
            "email": "wrongpw@test.com",
            "password": "WrongPassword1",
        })
        assert resp.status_code == 401

    def test_unknown_email_returns_401(self, client):
        resp = client.post("/api/auth/login", json={
            "email": "ghost@test.com",
            "password": "Ghost1234",
        })
        assert resp.status_code == 401

    def test_missing_email_field_returns_422(self, client):
        resp = client.post("/api/auth/login", json={"password": "Secret123"})
        assert resp.status_code == 422

    def test_missing_password_field_returns_422(self, client):
        resp = client.post("/api/auth/login", json={"email": "x@test.com"})
        assert resp.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# Protected route — GET /api/auth/me
# ─────────────────────────────────────────────────────────────────────────────

class TestGetMe:
    def test_me_without_token_returns_401(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_with_invalid_token_returns_401(self, client):
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.real.token"})
        assert resp.status_code == 401

    def test_me_with_valid_token_returns_user_info(self, client, db):
        make_user(db, email="me@test.com", password="Me12345", role="admin")
        headers = auth_headers(client, email="me@test.com", password="Me12345")
        resp = client.get("/api/auth/me", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "me@test.com"
        assert data["role"] == "admin"
