"""
tests/test_metal_rates.py
==========================
Tests for metal rate endpoints:
  GET  /api/metal-rates          — list all rates
  GET  /api/metal-rates/current  — latest rate per metal type
  POST /api/metal-rates          — create rate (manager+)
"""

from tests.conftest import make_store, make_user, auth_headers


def _manager_ctx(client, db):
    store = make_store(db, name="Rates Store", customer_code="RATES-001")
    make_user(db, email="mgr@rates.com", password="Manager1", role="manager", store_id=store.id)
    return store, auth_headers(client, "mgr@rates.com", "Manager1")


def _staff_ctx(client, db):
    store = make_store(db, name="Staff Rates", customer_code="SRTS-001")
    # Need an existing admin so staff user isn't auto-promoted
    make_user(db, email="admin@rates.com", password="Admin123", role="admin", store_id=store.id)
    make_user(db, email="staff@rates.com", password="Staff123", role="staff", store_id=store.id)
    return store, auth_headers(client, "staff@rates.com", "Staff123")


class TestListRates:
    def test_empty_list_for_new_db(self, client, db):
        _, headers = _staff_ctx(client, db)
        resp = client.get("/api/metal-rates", headers=headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_created_rates(self, client, db):
        _, headers = _manager_ctx(client, db)
        client.post("/api/metal-rates", json={"metal_type": "gold", "rate_per_unit": 6500.0, "unit": "gram"}, headers=headers)
        resp = client.get("/api/metal-rates", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["metal_type"] == "gold"

    def test_requires_auth(self, client):
        resp = client.get("/api/metal-rates")
        assert resp.status_code == 401


class TestGetCurrentRates:
    def test_returns_latest_per_metal(self, client, db):
        _, headers = _manager_ctx(client, db)
        client.post("/api/metal-rates", json={"metal_type": "gold", "rate_per_unit": 6000.0, "unit": "gram"}, headers=headers)
        client.post("/api/metal-rates", json={"metal_type": "gold", "rate_per_unit": 6500.0, "unit": "gram"}, headers=headers)
        client.post("/api/metal-rates", json={"metal_type": "silver", "rate_per_unit": 80.0, "unit": "gram"}, headers=headers)

        resp = client.get("/api/metal-rates/current", headers=headers)
        assert resp.status_code == 200
        metals = {r["metal_type"]: r["rate_per_unit"] for r in resp.json()}
        # Only ONE entry per metal type
        assert len(metals) == 2
        assert "gold" in metals
        assert "silver" in metals

    def test_requires_auth(self, client):
        resp = client.get("/api/metal-rates/current")
        assert resp.status_code == 401


class TestCreateRate:
    def test_manager_can_create_rate(self, client, db):
        _, headers = _manager_ctx(client, db)
        resp = client.post("/api/metal-rates", json={
            "metal_type": "platinum",
            "rate_per_unit": 3200.0,
            "unit": "gram",
        }, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["metal_type"] == "platinum"
        assert data["rate_per_unit"] == 3200.0

    def test_staff_cannot_create_rate(self, client, db):
        _, headers = _staff_ctx(client, db)
        resp = client.post("/api/metal-rates", json={
            "metal_type": "gold",
            "rate_per_unit": 5000.0,
            "unit": "gram",
        }, headers=headers)
        assert resp.status_code == 403

    def test_missing_metal_type_returns_422(self, client, db):
        _, headers = _manager_ctx(client, db)
        resp = client.post("/api/metal-rates", json={"rate_per_unit": 5000.0, "unit": "gram"}, headers=headers)
        assert resp.status_code == 422

    def test_missing_rate_returns_422(self, client, db):
        _, headers = _manager_ctx(client, db)
        resp = client.post("/api/metal-rates", json={"metal_type": "gold", "unit": "gram"}, headers=headers)
        assert resp.status_code == 422

    def test_requires_auth(self, client):
        resp = client.post("/api/metal-rates", json={"metal_type": "gold", "rate_per_unit": 5000.0, "unit": "gram"})
        assert resp.status_code == 401
