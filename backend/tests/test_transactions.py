"""
tests/test_transactions.py
===========================
Tests for transaction endpoints:
  POST /api/transactions            — create transaction
  GET  /api/transactions            — list transactions
  GET  /api/transactions/{id}       — get transaction
  GET  /api/transactions/invoice/{id} — get invoice data
"""

from tests.conftest import make_store, make_user, auth_headers
from models.customer import Customer


def _ctx(client, db):
    store = make_store(db, name="Txn Store", customer_code="TXN-001")
    make_user(db, email="staff@txn.com", password="Staff123", role="staff", store_id=store.id)
    headers = auth_headers(client, "staff@txn.com", "Staff123")
    # Create a customer to associate transactions with
    customer = Customer(name="Txn Customer", primary_phone="9000000001", store_id=store.id, is_active=True)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return store, headers, customer


def _valid_txn_payload(customer_id, customer_name="Txn Customer"):
    return {
        "customerId": customer_id,
        "customerName": customer_name,
        "products": [
            {
                "productName": "Gold Ring",
                "metalType": "gold",
                "weight": 5.0,
                "rate": 6500.0,
                "makingCharge": 500.0,
                "diamondCharge": 0.0,
                "gstPercent": 3.0,
                "metalValue": 32500.0,
                "gstAmount": 975.0,
                "total": 33975.0,
            }
        ],
        "grandTotal": 33975.0,
        "paidAmount": 33975.0,
        "dueAmount": 0.0,
        "date": "2026-05-03T10:00:00",
        "paymentMode": "cash",
    }


class TestCreateTransaction:
    def test_create_valid_transaction(self, client, db):
        store, headers, customer = _ctx(client, db)
        resp = client.post("/api/transactions/add", json=_valid_txn_payload(customer.id), headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["customerId"] == customer.id
        assert data["grandTotal"] == 33975.0

    def test_requires_auth(self, client):
        resp = client.post("/api/transactions/add", json={})
        assert resp.status_code == 401

    def test_grand_total_mismatch_returns_400(self, client, db):
        store, headers, customer = _ctx(client, db)
        payload = _valid_txn_payload(customer.id)
        payload["grandTotal"] = 99999.0  # doesn't match product sum
        resp = client.post("/api/transactions/add", json=payload, headers=headers)
        assert resp.status_code == 400

    def test_paid_plus_due_mismatch_returns_400(self, client, db):
        store, headers, customer = _ctx(client, db)
        payload = _valid_txn_payload(customer.id)
        payload["paidAmount"] = 1.0
        payload["dueAmount"] = 1.0  # 1+1 != 33975
        resp = client.post("/api/transactions/add", json=payload, headers=headers)
        assert resp.status_code == 400

    def test_partial_payment_creates_due(self, client, db):
        store, headers, customer = _ctx(client, db)
        payload = _valid_txn_payload(customer.id)
        payload["paidAmount"] = 20000.0
        payload["dueAmount"] = 13975.0
        resp = client.post("/api/transactions/add", json=payload, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["dueAmount"] == 13975.0

    def test_nonexistent_customer_returns_404(self, client, db):
        store, headers, _ = _ctx(client, db)
        resp = client.post("/api/transactions/add", json=_valid_txn_payload(999999), headers=headers)
        assert resp.status_code == 404


class TestListTransactions:
    def test_list_requires_auth(self, client, db):
        store, headers, customer = _ctx(client, db)
        resp = client.get(f"/api/transactions/{customer.id}")
        assert resp.status_code == 401

    def test_list_returns_customer_transactions(self, client, db):
        store, headers, customer = _ctx(client, db)
        client.post("/api/transactions/add", json=_valid_txn_payload(customer.id), headers=headers)
        resp = client.get(f"/api/transactions/{customer.id}", headers=headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1


class TestGetTransaction:
    def test_get_existing_transaction(self, client, db):
        store, headers, customer = _ctx(client, db)
        create_resp = client.post("/api/transactions/add", json=_valid_txn_payload(customer.id), headers=headers)
        txn_id = create_resp.json()["id"]
        # Get via invoice endpoint (the only single-txn GET)
        resp = client.get(f"/api/transactions/invoice/{txn_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["transaction"]["id"] == txn_id

    def test_requires_auth(self, client):
        resp = client.get("/api/transactions/invoice/1")
        assert resp.status_code == 401


class TestGetInvoice:
    def test_get_invoice_for_transaction(self, client, db):
        store, headers, customer = _ctx(client, db)
        create_resp = client.post("/api/transactions/add", json=_valid_txn_payload(customer.id), headers=headers)
        txn_id = create_resp.json()["id"]
        resp = client.get(f"/api/transactions/invoice/{txn_id}", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "transaction" in data
        assert data["transaction"]["id"] == txn_id

    def test_invoice_nonexistent_txn_returns_404(self, client, db):
        _, headers, _ = _ctx(client, db)
        resp = client.get("/api/transactions/invoice/999999", headers=headers)
        assert resp.status_code == 404
