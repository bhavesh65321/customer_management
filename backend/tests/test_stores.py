"""
tests/test_stores.py
=====================
Tests for store endpoints:
  GET  /api/stores/me       — get current user's store
  GET  /api/stores          — list all stores
  GET  /api/stores/{id}     — get store by id
  PUT  /api/stores/{id}     — update store
"""

from tests.conftest import make_store, make_user, auth_headers


def _staff_ctx(client, db, store_name="Test Store", code="TST-001"):
    store = make_store(db, name=store_name, customer_code=code)
    make_user(db, email=f"admin_{code}@stores.com", password="Admin123", role="admin", store_id=store.id)
    make_user(db, email=f"staff_{code}@stores.com", password="Staff123", role="staff", store_id=store.id)
    headers = auth_headers(client, f"staff_{code}@stores.com", "Staff123")
    return store, headers


def _admin_ctx(client, db, code="ADM-001"):
    store = make_store(db, name=f"Admin Store {code}", customer_code=code)
    make_user(db, email=f"admin_{code}@stores.com", password="Admin123", role="admin", store_id=store.id)
    headers = auth_headers(client, f"admin_{code}@stores.com", "Admin123")
    return store, headers


class TestGetMyStore:
    def test_returns_linked_store(self, client, db):
        store, headers = _staff_ctx(client, db, "My Store", "MY-001")
        resp = client.get("/api/stores/me", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "My Store"

    def test_no_store_linked_returns_404(self, client, db):
        # admin with no store_id
        make_user(db, email="nostore@stores.com", password="Admin123", role="admin", store_id=None)
        headers = auth_headers(client, "nostore@stores.com", "Admin123")
        resp = client.get("/api/stores/me", headers=headers)
        assert resp.status_code == 404

    def test_requires_auth(self, client):
        resp = client.get("/api/stores/me")
        assert resp.status_code == 401


class TestListStores:
    def test_staff_can_list_stores(self, client, db):
        _, headers = _staff_ctx(client, db, "List Store", "LST-001")
        resp = client.get("/api/stores", headers=headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1

    def test_requires_auth(self, client):
        resp = client.get("/api/stores")
        assert resp.status_code == 401


class TestGetStore:
    def test_get_existing_store(self, client, db):
        store, headers = _staff_ctx(client, db, "Find Me Store", "FND-001")
        resp = client.get(f"/api/stores/{store.id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Find Me Store"

    def test_get_nonexistent_store_returns_404(self, client, db):
        _, headers = _staff_ctx(client, db, "Miss Store", "MSS-001")
        resp = client.get("/api/stores/999999", headers=headers)
        assert resp.status_code == 404

    def test_requires_auth(self, client):
        resp = client.get("/api/stores/1")
        assert resp.status_code == 401


class TestUpdateStore:
    def test_update_store_name(self, client, db):
        store, headers = _staff_ctx(client, db, "Old Name Store", "UPD-001")
        resp = client.put(f"/api/stores/{store.id}", json={"name": "New Name Store"}, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name Store"

    def test_update_nonexistent_store_returns_404(self, client, db):
        _, headers = _staff_ctx(client, db, "Update Miss", "UPM-001")
        resp = client.put("/api/stores/999999", json={"name": "Ghost"}, headers=headers)
        assert resp.status_code == 404
