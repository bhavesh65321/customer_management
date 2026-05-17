# Admin Console — Functional & Technical Design Specification

**Product:** Jewellery Business Management SaaS  
**Module:** Super-Admin Console (`/admin`)  
**Version:** 1.0  
**Date:** May 2026  
**Authors:** Platform Engineering Team

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Functional Design](#3-functional-design)
   - 3.1 Overview Dashboard
   - 3.2 Stores List
   - 3.3 Store Detail Page
   - 3.4 Users Management *(planned)*
   - 3.5 Subscriptions *(planned)*
   - 3.6 Platform Health *(planned)*
   - 3.7 Settings *(planned)*
4. [Technical Design](#4-technical-design)
   - 4.1 Architecture
   - 4.2 Backend API Reference
   - 4.3 Frontend Component Map
   - 4.4 Data Models
   - 4.5 Auth & Guard Strategy
   - 4.6 Error Handling
5. [Current Status](#5-current-status)
6. [Roadmap & Priorities](#6-roadmap--priorities)

---

## 1. Product Overview

The **Admin Console** is the platform-operator interface. It sits above all tenant stores and gives the operator (super-admin) a single pane of glass to:

- Onboard and configure jewellery stores
- Monitor revenue and activity across all stores
- Manage users (staff/admins) across every store
- Control license plans and expiry
- Audit platform health

**Who uses it:** Only users with `role = "admin"` can access any `/admin` route. Non-admin users are redirected to `/home` on the frontend and receive `HTTP 403` on the backend.

**Multi-tenancy model:** Each jewellery shop is a `Store` record. Every customer, transaction, girvi loan, stock item, and karigar is scoped to exactly one store. The admin console cuts across all stores.

---

## 2. User Roles & Permissions

| Role | Description | Admin Console Access |
|------|-------------|---------------------|
| `admin` | Platform super-admin | Full access to all `/admin` routes |
| `manager` | Store-level manager | Read access to own store data only |
| `staff` | Store employee | No admin access |
| `customer` | End-customer (portal) | No admin access |

### Role Enforcement

**Backend:** Every admin endpoint uses `Depends(require_admin)` from `dependencies.py`. Requests without a valid JWT carrying `role=admin` receive `HTTP 403 Forbidden`.

**Frontend:** `AdminDashboard.jsx` and `StoreDetailPage.jsx` read the JWT payload on mount:
```js
const payload = parseJwt(getToken());
if (payload?.role !== "admin") navigate("/home", { replace: true });
```

---

## 3. Functional Design

### 3.1 Overview Dashboard — `/admin`

**Purpose:** Answer "is the platform healthy?" within 10 seconds of opening.

#### KPI Strip (top of page)

| Card | Value | Colour logic |
|------|-------|-------------|
| Total Stores | Count of all stores | Neutral |
| Active Stores | `is_active = true` count | Green |
| Expiring ≤30 days | Active stores with `license_expiry` within 30 days | Amber |
| Platform Revenue | Sum of all payments (all stores, all time) | Blue |

#### Store Table

Columns: **#** · **Store name + logo** · **Plan chip** · **Revenue** · **Owner** · **Location** · **Expiry** · **Status badge** · **Actions**

- **Plan chips:** `general` = blue · `simple` = purple · `premium` = amber
- **Status badges:** `Active` = green · `Expiring soon` = amber · `Expired` = red · `Inactive` = grey
- **Actions per row:** `View` (→ Store Detail) · `Edit` (opens Edit modal) · `Delete` (confirm dialog)

#### Filters (above table)

Row 1: Search by name/owner/phone · Plan filter dropdown · Status filter dropdown  
Row 2: Active-only toggle

#### Onboard Wizard

Opens a 2-step wizard:
1. **Store Info** — name, address, city, phone, GSTIN, BIS Reg, join date, license expiry, plan
2. **Owner Account** — owner name, owner email, initial password

On submit: calls `POST /api/admin/onboard` which atomically creates the Store + admin User in one transaction.

#### Edit Modal

Inline modal triggered by the Edit action. Pre-fills all store fields. Calls `PUT /api/admin/stores/{id}`. Logo upload supported (max 2 MB, JPEG/PNG/WebP/GIF).

---

### 3.2 Stores List — part of `/admin`

The stores table is embedded in the Overview Dashboard (not a separate page). Key behaviours:

- Table has `min-width: 860px` with horizontal scroll on mobile
- All cells use `whitespace-nowrap` to prevent wrapping
- Empty state: "No stores yet — onboard your first store" with a CTA button
- Deleting a store shows a `ConfirmDialog` before proceeding
- After any mutation (create / edit / delete), `fetchStores()` is called to refresh the list

---

### 3.3 Store Detail Page — `/admin/stores/:storeId`

**Purpose:** Full profile of one store — revenue breakdown, staff, recent payments.

#### Header Card

- Store logo (or initials fallback with gradient background)
- Store name + plan chip + active/inactive badge
- Store code (monospace), phone, location
- Owner name + email
- Expiry date with colour-coded countdown (`X days left` / `Expires today` / `Expired N days ago`)
- GSTIN and BIS Reg (if present)

#### 4 KPI Cards

| Card | API field | Icon |
|------|-----------|------|
| Revenue (all time) | `revenue.total_revenue` | 💰 |
| Total Customers | `revenue.customer_count` | 👥 |
| Total Transactions | `revenue.transaction_count` | 🧾 |
| Staff Members | `users.length` | 🧑‍💼 |

#### Revenue Section

- **By Payment Mode:** pill badges for each mode (cash / UPI / card / credit) with amount
- **Recent Payments table:** Date · Amount · Mode (last 10 payments)

#### Staff Table

Columns: Name · Role chip · Last login (placeholder) · Status badge  
Role chips: `admin` = red · `manager` = blue · `staff` = grey

---

### 3.4 Users Management — `/admin/users` *(Planned)*

**Purpose:** See and manage every human account on the platform.

#### Table columns

Name · Email · Role · Store · Created date · Last login · Status · Actions

#### Actions

- Reset password (admin sets a new temporary password)
- Change role (admin → manager → staff)
- Move to different store
- Deactivate / reactivate account
- Delete (blocked if last admin)

#### Filters

Role dropdown · Store dropdown · Active/inactive toggle · Name/email search

---

### 3.5 Subscriptions — `/admin/subscriptions` *(Planned)*

**Purpose:** Manage plans and billing per store.

#### Plan Tiers

| Plan | Price | Limits |
|------|-------|--------|
| Starter | ₹499/mo | 1 staff · 200 customers · No AI |
| Pro | ₹1,499/mo | 5 staff · Unlimited customers · AI insights |
| Enterprise | Custom | Unlimited · White-label · API access |

#### Per-store actions

- Change plan (dropdown)
- Manual payment mark (record payment received)
- Extend expiry by N days
- Apply coupon/discount
- View invoice history

#### Expiry dashboard

Calendar view showing which stores expire in which week, colour-coded by urgency.

---

### 3.6 Platform Health — `/admin/health` *(Planned)*

| Widget | Metric |
|--------|--------|
| API error rate | 5xx count (last 24h) |
| Slow endpoints | P95 latency by route |
| Background jobs | Last run · Next run · Failure count (reminders, rate sync) |
| DB connections | Active connections · Long-running queries |
| Push notifications | Delivery success rate |

---

### 3.7 Settings — `/admin/settings` *(Planned)*

| Setting | Description |
|---------|-------------|
| Metal rates override | Manual gold/silver/platinum fallback rates |
| Announcement banner | Message pushed to all store dashboards |
| Feature flags | Toggle AI insights, GST reports, customer portal per store or globally |
| Email/SMS config | SMTP host, Twilio credentials |
| Audit log retention | Days to keep activity logs |

---

## 4. Technical Design

### 4.1 Architecture

```
Browser
  └── React SPA (CRA + Tailwind)
        ├── /admin                → AdminDashboard.jsx
        └── /admin/stores/:id     → StoreDetailPage.jsx

        Auth guard: parseJwt(getToken()).role === "admin"

FastAPI Backend
  └── /api/admin/*               → backend/routes/admin.py
        Auth guard: Depends(require_admin)
        DB: SQLAlchemy → MySQL (via docker-compose)
```

### 4.2 Backend API Reference

Base path: `/api/admin`  
Auth: All endpoints require `Authorization: Bearer <JWT>` with `role=admin`.

---

#### Users

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/users` | List all users. Query: `?role=staff` | admin |
| `POST` | `/users` | Create a user. Body: `AdminUserCreate` | admin |
| `PUT` | `/users/{id}` | Update user fields | admin |
| `DELETE` | `/users/{id}` | Delete user (blocked if last admin) | admin |

**`AdminUserCreate` body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string (min 8 chars, 1 upper, 1 digit)",
  "role": "admin | manager | staff | customer",
  "store_id": 1,
  "designation": "string?",
  "phone": "string?",
  "address": "string?",
  "monthly_pay": 0.0,
  "join_date": "YYYY-MM-DD?"
}
```

**`UserOut` response:**
```json
{
  "id": 1,
  "name": "string",
  "email": "string",
  "role": "string",
  "store_id": 1,
  "is_active": true,
  "designation": "string?",
  "phone": "string?",
  "join_date": "YYYY-MM-DD?"
}
```

---

#### Stores

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/stores` | List all stores with revenue. Query: `?is_active=true` |
| `GET` | `/stores/{id}` | Full store detail (includes users list) |
| `POST` | `/stores` | Create store (manual, not wizard) |
| `PUT` | `/stores/{id}` | Update store fields |
| `DELETE` | `/stores/{id}` | Delete store |
| `GET` | `/stores/{id}/users` | List all users in a store |
| `GET` | `/stores/{id}/revenue` | Revenue breakdown for one store |
| `POST` | `/stores/{id}/logo` | Upload store logo (multipart, max 2 MB) |

**`GET /stores` response item:**
```json
{
  "id": 1,
  "name": "Soni Jewellers",
  "customer_code": "SONIJEW-X7K2MQ",
  "join_date": "2025-01-15",
  "license_expiry": "2026-06-12",
  "license_type": "premium",
  "is_active": true,
  "location": "Mumbai",
  "contact_phone": "9876543210",
  "owner_name": "Bhavesh Soni",
  "owner_email": "bhavesh@soni.com",
  "logo_url": "/uploads/store_logos/abc.jpg",
  "revenue": 420000.0
}
```

**`GET /stores/{id}/revenue` response:**
```json
{
  "store_id": 1,
  "store_name": "Soni Jewellers",
  "total_revenue": 420000.0,
  "payment_count": 312,
  "customer_count": 150,
  "transaction_count": 289,
  "by_payment_mode": {
    "cash": 200000.0,
    "upi": 150000.0,
    "card": 70000.0
  },
  "recent_payments": [
    { "id": 45, "amount": 5000.0, "payment_mode": "upi", "created_at": "2026-05-03T10:22:00" }
  ]
}
```

---

#### Stats & Onboard

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/stats` | Platform-wide KPIs |
| `POST` | `/onboard` | Create store + admin user atomically |
| `POST` | `/stores/{id}/assign-code` | Assign or regenerate store code |

**`GET /stats` response:**
```json
{
  "total": 42,
  "active": 38,
  "inactive": 4,
  "expiring_soon": 5,
  "expired": 2,
  "by_license_type": { "general": 10, "simple": 20, "premium": 12 },
  "total_revenue": 18500000.0
}
```

**`POST /onboard` body:**
```json
{
  "store": {
    "name": "Gold Palace",
    "address": "123 Main St",
    "location": "Delhi",
    "contact_phone": "9000000001",
    "license_type": "pro",
    "license_expiry": "2027-01-01",
    "join_date": "2026-05-03",
    "gstin": "27AABCU9603R1ZX",
    "owner_name": "Raj Kumar",
    "owner_email": "raj@goldpalace.com"
  },
  "owner": {
    "name": "Raj Kumar",
    "email": "raj@goldpalace.com",
    "password": "SecurePass1"
  }
}
```

---

### 4.3 Frontend Component Map

```
src/pages/
  AdminDashboard.jsx          Main admin page — KPIs, store table, wizard, edit modal
  StoreDetailPage.jsx         Store detail — header, KPIs, revenue, staff table

src/components/ui/
  BackButton.jsx              ← Back navigation
  ConfirmationPop.jsx         Destructive action confirm dialog
  InlineError.jsx             Inline error banner
```

#### `AdminDashboard.jsx` — State inventory

| State var | Type | Purpose |
|-----------|------|---------|
| `stores` | `Store[]` | All stores from API |
| `stats` | `object` | KPI numbers |
| `search` | `string` | Name/phone search filter |
| `filterPlan` | `string` | Plan filter |
| `filterStatus` | `string` | active/expiring/expired |
| `showWizard` | `bool` | Onboard wizard visibility |
| `wizardStep` | `1 \| 2` | Which step of the wizard |
| `editStore` | `Store \| null` | Store being edited in modal |
| `deleteStore` | `Store \| null` | Store pending deletion confirm |
| `formError` | `string` | Inline error message |
| `loading` | `bool` | Loading state |

#### `StoreDetailPage.jsx` — State inventory

| State var | Type | Purpose |
|-----------|------|---------|
| `store` | `Store \| null` | Store profile data |
| `revenue` | `RevenueData \| null` | Revenue breakdown |
| `users` | `User[]` | Staff in this store |
| `loading` | `bool` | Loading state |
| `error` | `string` | Error message |

#### Data fetch strategy

- `AdminDashboard`: `fetchStats()` + `fetchStores()` fire in parallel via `Promise.all` on mount
- `StoreDetailPage`: `fetchAll()` fires 3 requests in parallel (`store` + `revenue` + `users`) on mount, wrapped in `useCallback` to prevent stale closures

---

### 4.4 Data Models

#### `Store` (SQLAlchemy — `stores` table)

| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | Auto-increment |
| `name` | String(255) | Required |
| `customer_code` | String(50) | Unique · Pattern: `PREFIX-XXXXXX` |
| `gstin` | String(20) | Optional |
| `bis_reg` | String(100) | Optional |
| `join_date` | Date | When store joined platform |
| `license_expiry` | Date | Plan expiry date |
| `license_type` | String(20) | `general` / `simple` / `premium` |
| `is_active` | Boolean | Default `true` |
| `address` | String(500) | Optional |
| `location` | String(255) | City / region |
| `contact_phone` | String(20) | Unique index |
| `logo_url` | String(500) | Relative path to uploaded file |
| `owner_name` | String(150) | Reference only |
| `owner_email` | String(150) | Reference only |
| `state_code` | String(3) | GST state code e.g. `"27"` |
| `invoice_prefix` | String(6) | GST invoice prefix e.g. `"GP"` |
| `invoice_seq_current` | Integer | Last used invoice seq number |
| `default_hsn_*` | String(10) | Default HSN codes per metal type |

#### `User` (SQLAlchemy — `users` table)

| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `name` | String | Required |
| `email` | String | Unique |
| `hashed_password` | String | bcrypt hash |
| `role` | String | `admin` / `manager` / `staff` / `customer` |
| `store_id` | FK → Store | Required for non-admin |
| `customer_id` | FK → Customer | Only for role=customer |
| `is_active` | Boolean | Default `true` |
| `designation` | String | e.g. "Sales Manager" |
| `phone` | String | Optional |
| `join_date` | Date | Optional |
| `monthly_pay` | Float | Optional payroll field |

#### `Payment` (SQLAlchemy — `payments` table)

Used for revenue aggregation across all admin revenue queries.

| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `store_id` | FK → Store | Revenue scoped per store |
| `amount` | Float | Payment amount |
| `payment_mode` | String | `cash` / `upi` / `card` / `credit` |
| `created_at` | DateTime | Used for "recent payments" sort |

---

### 4.5 Auth & Guard Strategy

#### JWT Payload

```json
{
  "sub": "user@email.com",
  "user_id": 42,
  "role": "admin",
  "store_id": 1,
  "exp": 1746400000
}
```

#### Backend guard — `require_admin` (in `dependencies.py`)

```python
def require_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_token(token)          # raises 401 if invalid/expired
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload
```

#### Frontend guard — inline in each admin page

```js
useEffect(() => {
  const payload = parseJwt(getToken());
  if (!payload || payload.role !== "admin") navigate("/home", { replace: true });
}, [navigate]);
```

#### Token helpers (`src/api.js`)

| Function | Purpose |
|----------|---------|
| `getToken()` | Read JWT from `localStorage` |
| `parseJwt(token)` | Decode payload without verifying (client-side only) |
| `authHeaders()` | Return `{ "Authorization": "Bearer <token>", "Content-Type": "application/json" }` |
| `authHeadersMultipart()` | Same but without `Content-Type` (for file uploads) |
| `API_BASE` | Base URL from `REACT_APP_API_URL` env var |

---

### 4.6 Error Handling

#### Backend

All admin routes follow this pattern:
- `404` — Resource not found (store/user ID doesn't exist)
- `400` — Validation error (duplicate email, duplicate store name, weak password)
- `401` — Token missing or expired
- `403` — Valid token but role ≠ admin
- `422` — Pydantic validation error (missing required fields)

Error body shape:
```json
{ "detail": "Human-readable message" }
```

#### Frontend

- **`formError` state** — shown via `<InlineError>` component above the table/wizard
- **401 response** → `navigate("/login")` immediately
- **File upload errors** — caught in `postStoreLogo()`, re-thrown to surface in `formError`
- **Wizard errors** — shown inline within the wizard step, wizard stays open

---

## 5. Current Status

### Built & Shipped ✅

| Feature | Files |
|---------|-------|
| KPI strip (4 cards) | `AdminDashboard.jsx` + `GET /api/admin/stats` |
| Store list with plan + revenue | `AdminDashboard.jsx` + `GET /api/admin/stores` |
| Search + filter (2 rows) | `AdminDashboard.jsx` (client-side filter) |
| 2-step onboard wizard | `AdminDashboard.jsx` + `POST /api/admin/onboard` |
| Edit store modal | `AdminDashboard.jsx` + `PUT /api/admin/stores/{id}` |
| Logo upload | `AdminDashboard.jsx` + `POST /api/admin/stores/{id}/logo` |
| Delete store | `AdminDashboard.jsx` + `DELETE /api/admin/stores/{id}` |
| Store detail page | `StoreDetailPage.jsx` |
| Store detail — 4 KPI cards | `StoreDetailPage.jsx` + `GET /api/admin/stores/{id}/revenue` |
| Store detail — revenue by mode | `StoreDetailPage.jsx` |
| Store detail — recent payments | `StoreDetailPage.jsx` |
| Store detail — staff table | `StoreDetailPage.jsx` + `GET /api/admin/stores/{id}/users` |
| Users CRUD API | `routes/admin.py` — all 4 endpoints |
| Admin route guard (backend) | `require_admin` dependency |
| Admin route guard (frontend) | `parseJwt` check in both pages |

### Planned ❌

| Feature | Priority | Backend ready? |
|---------|----------|---------------|
| Users management page `/admin/users` | P1 | ✅ All 4 endpoints exist |
| Store suspension (toggle `is_active`) | P1 | ✅ `PUT /stores/{id}` supports `is_active` |
| Subscriptions / plan management | P2 | ❌ Needs new endpoints |
| Audit log viewer | P2 | ✅ `AuditLog` model + `log_activity()` exist |
| Announcement banner | P3 | ❌ Needs `announcements` table + route |
| Feature flags per store | P3 | ❌ Needs `feature_flags` table |
| Platform health dashboard | P3 | ❌ Needs new `/api/admin/health` endpoint |
| Expiry calendar view | P4 | ✅ Data available from `/stats` |

---

## 6. Roadmap & Priorities

### P1 — Quick wins (backend already done)

#### 1. Users Management Page

**Why first:** Backend has all 4 CRUD endpoints + tests. Zero backend work needed.

**What to build:**
- New page `src/pages/AdminUsersPage.jsx`
- Table: Name · Email · Role chip · Store name · Status · Actions
- Actions: Edit role, deactivate/reactivate, reset password, delete
- Add route `<Route path="admin/users" element={<AdminUsersPage />} />`
- Add "Users" tab/link to `AdminDashboard.jsx`

#### 2. Store Suspension Toggle

**Why:** Store admins occasionally need to be locked out without deleting data.

**What to build:**
- "Suspend" / "Reactivate" button on `StoreDetailPage.jsx` header
- Calls `PUT /api/admin/stores/{id}` with `{ "is_active": false }`
- Store detail shows red "Suspended" badge when `is_active = false`

---

### P2 — Medium effort

#### 3. Subscriptions Panel

**Backend needed:**
```python
PUT /api/admin/stores/{id}/plan
  body: { "license_type": "premium", "license_expiry": "2027-06-01" }
```
Already achievable via `PUT /api/admin/stores/{id}` — just needs UI.

#### 4. Audit Log Viewer

**Backend needed:** `GET /api/admin/audit-log?store_id=&limit=50`  
**Model:** `AuditLog` already exists, `log_activity()` already writes to it.

---

### P3 — New feature work

#### 5. Announcement Banner

```sql
CREATE TABLE announcements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message TEXT NOT NULL,
  created_at DATETIME,
  expires_at DATETIME,
  is_active BOOLEAN DEFAULT TRUE
);
```

Backend: `POST /api/admin/announcements` + `GET /api/announcements/active`  
Frontend: `ShopLayout.jsx` fetches and renders banner if active

#### 6. Platform Health Endpoint

```python
GET /api/admin/health
# Returns: { api_errors_24h, slow_endpoints, job_status, db_connections }
```

---

*Document maintained in `/docs/ADMIN_DESIGN_SPEC.md`*
