"""
tests/test_payments.py
=======================
Tests for payment endpoints:
  GET /api/payments/outstanding  — transactions with due_amount > 0
  GET /api/payments/history      — payment history
"""

from tests.conftest import make_store, make_user, auth_headers
from models.transactional import Transaction
from models.payment import Payment
from datetime import datetime


def _ctx(client, db):
    store = make_store(db, name="Pay Store", customer_code="PAY-001")
    make_user(db, email="staff@pay.com", password="Staff123", role="staff", store_id=store.id)
    headers = auth_headers(client, "staff@pay.com", "Staff123")
    return store, headers


def _make_transaction(db, store_id, customer_id=1, customer_name="Test Customer",
                      grand_total=1000.0, paid_amount=500.0, due_amount=500.0):
    t = Transaction(
        customer_id=customer_id,
        customer_name=customer_name,
        store_id=store_id,
        grand_total=grand_total,
        paid_amount=paid_amount,
        due_amount=due_amount,
        date=datetime.utcnow(),
        products=[],
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def _make_payment(db, transaction_id, store_id, amount=500.0, mode="cash"):
    p = Payment(
        transaction_id=transaction_id,
        store_id=store_id,
        amount=amount,
        payment_mode=mode,
        created_at=datetime.utcnow(),
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


class TestOutstandingPayments:
    def test_returns_transactions_with_due(self, client, db):
        store, headers = _ctx(client, db)
        _make_transaction(db, store.id, due_amount=750.0, paid_amount=250.0, grand_total=1000.0)
        resp = client.get("/api/payments/outstanding", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "totalDue" in data
        assert len(data["items"]) >= 1
        assert data["totalDue"] >= 750.0

    def test_no_outstanding_returns_empty(self, client, db):
        store, headers = _ctx(client, db)
        # Create a fully paid transaction
        _make_transaction(db, store.id, due_amount=0.0, paid_amount=1000.0, grand_total=1000.0)
        resp = client.get("/api/payments/outstanding", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["count"] == 0

    def test_requires_auth(self, client):
        resp = client.get("/api/payments/outstanding")
        assert resp.status_code == 401

    def test_store_scoping(self, client, db):
        """Staff should only see outstanding from their own store."""
        store, headers = _ctx(client, db)
        other_store = make_store(db, name="Other Store", customer_code="OTH-001")
        # Add due transaction to OTHER store — should NOT appear
        _make_transaction(db, other_store.id, due_amount=999.0, grand_total=999.0, paid_amount=0.0)
        # Add due transaction to THIS store
        _make_transaction(db, store.id, due_amount=100.0, grand_total=100.0, paid_amount=0.0)

        resp = client.get("/api/payments/outstanding", headers=headers)
        assert resp.status_code == 200
        for item in resp.json()["items"]:
            assert item["dueAmount"] != 999.0


class TestPaymentHistory:
    def test_returns_payment_history(self, client, db):
        store, headers = _ctx(client, db)
        t = _make_transaction(db, store.id)
        _make_payment(db, t.id, store.id, amount=500.0)

        resp = client.get("/api/payments/history", headers=headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1

    def test_empty_history_returns_list(self, client, db):
        _, headers = _ctx(client, db)
        resp = client.get("/api/payments/history", headers=headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_requires_auth(self, client):
        resp = client.get("/api/payments/history")
        assert resp.status_code == 401

    def test_limit_param(self, client, db):
        store, headers = _ctx(client, db)
        t = _make_transaction(db, store.id)
        for i in range(5):
            _make_payment(db, t.id, store.id, amount=10.0 * (i + 1))

        resp = client.get("/api/payments/history?limit=3", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) <= 3
