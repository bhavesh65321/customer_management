"""
tests/test_history.py
======================
Tests for activity history endpoint:
  GET /api/history  — paginated audit log
"""

from tests.conftest import make_store, make_user, auth_headers
from models.audit_log import AuditLog
from datetime import datetime


def _ctx(client, db):
    store = make_store(db, name="History Store", customer_code="HIST-001")
    make_user(db, email="staff@hist.com", password="Staff123", role="staff", store_id=store.id)
    headers = auth_headers(client, "staff@hist.com", "Staff123")
    return store, headers


def _add_log(db, store_id, action="created", entity_type="customer", message="Test log"):
    row = AuditLog(
        store_id=store_id,
        action=action,
        entity_type=entity_type,
        entity_id="1",
        message=message,
        actor_name="Test User",
        created_at=datetime.utcnow(),
    )
    db.add(row)
    db.commit()
    return row


class TestActivityHistory:
    def test_returns_empty_list_initially(self, client, db):
        _, headers = _ctx(client, db)
        resp = client.get("/api/history", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 0

    def test_returns_store_logs(self, client, db):
        store, headers = _ctx(client, db)
        _add_log(db, store.id, message="Customer created")
        resp = client.get("/api/history", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert any("Customer created" in item["what"] for item in data["items"])

    def test_does_not_return_other_store_logs(self, client, db):
        store, headers = _ctx(client, db)
        other_store = make_store(db, name="Other Hist Store", customer_code="OHI-001")
        _add_log(db, other_store.id, message="Other store's secret log")
        resp = client.get("/api/history", headers=headers)
        assert resp.status_code == 200
        for item in resp.json()["items"]:
            assert "Other store's secret log" not in item["what"]

    def test_pagination_offset(self, client, db):
        store, headers = _ctx(client, db)
        for i in range(5):
            _add_log(db, store.id, message=f"Log entry {i}")
        resp_all = client.get("/api/history?limit=10&offset=0", headers=headers)
        resp_offset = client.get("/api/history?limit=10&offset=3", headers=headers)
        assert resp_all.status_code == 200
        assert resp_offset.status_code == 200
        assert len(resp_offset.json()["items"]) == resp_all.json()["total"] - 3

    def test_item_shape(self, client, db):
        store, headers = _ctx(client, db)
        _add_log(db, store.id, action="updated", entity_type="customer")
        resp = client.get("/api/history", headers=headers)
        item = resp.json()["items"][0]
        assert "id" in item
        assert "at" in item
        assert "who" in item
        assert "what" in item
        assert "area" in item
        assert "action" in item

    def test_requires_auth(self, client):
        resp = client.get("/api/history")
        assert resp.status_code == 401
