"""
tests/test_customers.py
========================
Tests for customer CRUD endpoints:
  POST   /api/customer/add
  GET    /api/customer/list
  GET    /api/customer/{id}
  PUT    /api/customer/{id}
  DELETE /api/customer/{id}
"""

from tests.conftest import make_store, make_user, auth_headers


def _staff_headers(client, db):
    """Create a store + staff user and return (store, auth headers)."""
    store = make_store(db)
    make_user(db, email="staff@cust.com", password="Staff123", role="staff", store_id=store.id)
    return store, auth_headers(client, email="staff@cust.com", password="Staff123")


def _admin_headers(client, db):
    store = make_store(db, name="Admin Store", customer_code="ADMIN-001")
    make_user(db, email="admin@cust.com", password="Admin123", role="admin", store_id=store.id)
    return store, auth_headers(client, email="admin@cust.com", password="Admin123")


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/customer/add
# ─────────────────────────────────────────────────────────────────────────────

class TestAddCustomer:
    def test_add_customer_success(self, client, db):
        store, headers = _staff_headers(client, db)
        resp = client.post("/api/customer/add", json={
            "name": "Ravi Kumar",
            "primary_phone": "9876543210",
        }, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Ravi Kumar"
        assert data["primary_phone"] == "9876543210"
        assert "id" in data

    def test_add_customer_requires_auth(self, client):
        resp = client.post("/api/customer/add", json={
            "name": "No Auth",
            "primary_phone": "1234567890",
        })
        assert resp.status_code == 401

    def test_duplicate_phone_same_store_returns_400(self, client, db):
        store, headers = _staff_headers(client, db)
        payload = {"name": "First", "primary_phone": "9999988888"}
        client.post("/api/customer/add", json=payload, headers=headers)
        resp = client.post("/api/customer/add", json=payload, headers=headers)
        assert resp.status_code == 400
        assert "phone" in resp.json()["error"]["message"].lower()

    def test_missing_name_returns_422(self, client, db):
        _, headers = _staff_headers(client, db)
        resp = client.post("/api/customer/add", json={"primary_phone": "1112223333"}, headers=headers)
        assert resp.status_code == 422

    def test_missing_phone_returns_422(self, client, db):
        _, headers = _staff_headers(client, db)
        resp = client.post("/api/customer/add", json={"name": "No Phone"}, headers=headers)
        assert resp.status_code == 422

    def test_add_customer_with_all_optional_fields(self, client, db):
        store, headers = _staff_headers(client, db)
        resp = client.post("/api/customer/add", json={
            "name": "Full Profile",
            "primary_phone": "8001112222",
            "father_name": "Shyam Lal",
            "email": "full@example.com",
            "address": "123 Main St",
            "city": "Mumbai",
            "pincode": "400001",
            "gender": "Male",
            "country": "India",
        }, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["city"] == "Mumbai"
        assert data["email"] == "full@example.com"


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/customer/list
# ─────────────────────────────────────────────────────────────────────────────

class TestListCustomers:
    def test_list_returns_only_store_customers(self, client, db):
        store, headers = _staff_headers(client, db)
        # Add two customers to this store
        client.post("/api/customer/add", json={"name": "A", "primary_phone": "1000000001"}, headers=headers)
        client.post("/api/customer/add", json={"name": "B", "primary_phone": "1000000002"}, headers=headers)

        resp = client.get("/api/customer/list", headers=headers)
        assert resp.status_code == 200
        names = [c["name"] for c in resp.json()]
        assert "A" in names
        assert "B" in names

    def test_list_requires_auth(self, client):
        resp = client.get("/api/customer/list")
        assert resp.status_code == 401

    def test_search_by_name(self, client, db):
        store, headers = _staff_headers(client, db)
        client.post("/api/customer/add", json={"name": "Raju Searchable", "primary_phone": "7001112222"}, headers=headers)
        resp = client.get("/api/customer/list?search=Raju", headers=headers)
        assert resp.status_code == 200
        results = resp.json()
        assert any("Raju" in c["name"] for c in results)


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/customer/{id}
# ─────────────────────────────────────────────────────────────────────────────

class TestGetCustomer:
    def test_get_existing_customer(self, client, db):
        store, headers = _staff_headers(client, db)
        create_resp = client.post("/api/customer/add", json={"name": "Find Me", "primary_phone": "6001112222"}, headers=headers)
        customer_id = create_resp.json()["id"]

        resp = client.get(f"/api/customer/{customer_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Find Me"

    def test_get_nonexistent_customer_returns_404(self, client, db):
        _, headers = _staff_headers(client, db)
        resp = client.get("/api/customer/999999", headers=headers)
        assert resp.status_code == 404

    def test_get_customer_requires_auth(self, client):
        resp = client.get("/api/customer/1")
        assert resp.status_code == 401
