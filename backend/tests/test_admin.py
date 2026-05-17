"""
tests/test_admin.py
====================
Tests for admin user-management endpoints:
  GET    /api/admin/users
  POST   /api/admin/users
  PUT    /api/admin/users/{id}
  DELETE /api/admin/users/{id}
"""

from tests.conftest import make_store, make_user, auth_headers


def _setup_admin(client, db):
    """Create a store + admin user; return (store, headers)."""
    store = make_store(db, name="Admin Store", customer_code="ADM-001")
    make_user(db, email="admin@admin.com", password="Admin123", role="admin", store_id=store.id)
    headers = auth_headers(client, email="admin@admin.com", password="Admin123")
    return store, headers


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/admin/users
# ─────────────────────────────────────────────────────────────────────────────

class TestListUsers:
    def test_admin_can_list_users(self, client, db):
        _, headers = _setup_admin(client, db)
        resp = client.get("/api/admin/users", headers=headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_non_admin_cannot_list_users(self, client, db):
        # Pre-create an admin so the staff user is NOT auto-promoted on login
        store = make_store(db, name="Staff Store", customer_code="STF-001")
        make_user(db, email="root@admin.com", password="Root1234", role="admin", store_id=store.id)
        make_user(db, email="staff@admin.com", password="Staff123", role="staff", store_id=store.id)
        headers = auth_headers(client, email="staff@admin.com", password="Staff123")
        resp = client.get("/api/admin/users", headers=headers)
        assert resp.status_code == 403

    def test_unauthenticated_cannot_list_users(self, client):
        resp = client.get("/api/admin/users")
        assert resp.status_code == 401

    def test_filter_by_role(self, client, db):
        _, headers = _setup_admin(client, db)
        resp = client.get("/api/admin/users?role=admin", headers=headers)
        assert resp.status_code == 200
        for user in resp.json():
            assert user["role"] == "admin"


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/admin/users
# ─────────────────────────────────────────────────────────────────────────────

class TestCreateUser:
    def test_admin_can_create_staff_user(self, client, db):
        store, headers = _setup_admin(client, db)
        resp = client.post("/api/admin/users", json={
            "name": "New Staff",
            "email": "newstaff@admin.com",
            "password": "Staff123",
            "role": "staff",
            "store_id": store.id,
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == "newstaff@admin.com"
        assert resp.json()["role"] == "staff"

    def test_staff_without_store_id_returns_400(self, client, db):
        _, headers = _setup_admin(client, db)
        resp = client.post("/api/admin/users", json={
            "name": "No Store",
            "email": "nostore@admin.com",
            "password": "Staff123",
            "role": "staff",
        }, headers=headers)
        assert resp.status_code == 400
        assert "store_id" in resp.json()["error"]["message"].lower()

    def test_duplicate_email_returns_400(self, client, db):
        store, headers = _setup_admin(client, db)
        client.post("/api/admin/users", json={
            "name": "First",
            "email": "dup@admin.com",
            "password": "First123",
            "role": "staff",
            "store_id": store.id,
        }, headers=headers)
        resp = client.post("/api/admin/users", json={
            "name": "Second",
            "email": "dup@admin.com",
            "password": "Second123",
            "role": "staff",
            "store_id": store.id,
        }, headers=headers)
        assert resp.status_code == 400

    def test_non_admin_cannot_create_user(self, client, db):
        # Pre-create admin so manager is NOT auto-promoted on login
        store = make_store(db, name="Manager Store", customer_code="MGR-001")
        make_user(db, email="root2@admin.com", password="Root1234", role="admin", store_id=store.id)
        make_user(db, email="mgr@admin.com", password="Manager1", role="manager", store_id=store.id)
        headers = auth_headers(client, email="mgr@admin.com", password="Manager1")
        resp = client.post("/api/admin/users", json={
            "name": "Sneaky",
            "email": "sneaky@admin.com",
            "password": "Sneaky12",
            "role": "staff",
            "store_id": store.id,
        }, headers=headers)
        assert resp.status_code == 403

    def test_weak_password_returns_400(self, client, db):
        store, headers = _setup_admin(client, db)
        resp = client.post("/api/admin/users", json={
            "name": "Weak",
            "email": "weak@admin.com",
            "password": "weak",
            "role": "staff",
            "store_id": store.id,
        }, headers=headers)
        # Pydantic min_length=8 returns 422; controller returns 400
        assert resp.status_code in (400, 422)


# ─────────────────────────────────────────────────────────────────────────────
# PUT /api/admin/users/{id}
# ─────────────────────────────────────────────────────────────────────────────

class TestUpdateUser:
    def test_admin_can_update_user_name(self, client, db):
        store, headers = _setup_admin(client, db)
        # Create a target user first
        create_resp = client.post("/api/admin/users", json={
            "name": "Old Name",
            "email": "old@admin.com",
            "password": "Old12345",
            "role": "staff",
            "store_id": store.id,
        }, headers=headers)
        user_id = create_resp.json()["id"]
        resp = client.put(f"/api/admin/users/{user_id}", json={"name": "New Name"}, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"

    def test_update_nonexistent_user_returns_404(self, client, db):
        _, headers = _setup_admin(client, db)
        resp = client.put("/api/admin/users/999999", json={"name": "Ghost"}, headers=headers)
        assert resp.status_code == 404

    def test_deactivate_user(self, client, db):
        store, headers = _setup_admin(client, db)
        create_resp = client.post("/api/admin/users", json={
            "name": "Active",
            "email": "active@admin.com",
            "password": "Active123",
            "role": "staff",
            "store_id": store.id,
        }, headers=headers)
        user_id = create_resp.json()["id"]
        resp = client.put(f"/api/admin/users/{user_id}", json={"is_active": False}, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/admin/users/{id}
# ─────────────────────────────────────────────────────────────────────────────

class TestDeleteUser:
    def test_admin_can_delete_staff_user(self, client, db):
        store, headers = _setup_admin(client, db)
        create_resp = client.post("/api/admin/users", json={
            "name": "Deletable",
            "email": "del@admin.com",
            "password": "Delete123",
            "role": "staff",
            "store_id": store.id,
        }, headers=headers)
        user_id = create_resp.json()["id"]
        resp = client.delete(f"/api/admin/users/{user_id}", headers=headers)
        assert resp.status_code == 204

    def test_cannot_delete_last_admin(self, client, db):
        _, headers = _setup_admin(client, db)
        # Get the admin's own ID
        me_resp = client.get("/api/auth/me", headers=headers)
        admin_id = me_resp.json()["id"]
        resp = client.delete(f"/api/admin/users/{admin_id}", headers=headers)
        assert resp.status_code == 400
        assert "last admin" in resp.json()["error"]["message"].lower()

    def test_delete_nonexistent_user_returns_404(self, client, db):
        _, headers = _setup_admin(client, db)
        resp = client.delete("/api/admin/users/999999", headers=headers)
        assert resp.status_code == 404
