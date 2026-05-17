# Software Design Document (SDD)
## Jewellery Management SaaS Platform

**Document Version:** 1.0  
**Date:** May 9, 2026  
**Author:** Generated from full codebase analysis  
**Repository:** `bhavesh65321/customer_management` (branch: `main`)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Backend Design](#3-backend-design)
4. [Data Model (Database Design)](#4-data-model-database-design)
5. [API Reference Summary](#5-api-reference-summary)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Frontend Design](#7-frontend-design)
8. [Business Domain Logic](#8-business-domain-logic)
9. [Cross-Cutting Concerns](#9-cross-cutting-concerns)
10. [Infrastructure & Deployment](#10-infrastructure--deployment)
11. [Known Gaps & Technical Debt](#11-known-gaps--technical-debt)

---

## 1. System Overview

### 1.1 Purpose

A multi-tenant SaaS platform for Indian jewellery shops to manage their daily operations:
- Customer records and loyalty
- Sales transactions with GST-compliant invoicing
- Girvi (pledge / gold loan) management
- Repair and custom order tracking with karigar assignment
- Serialized inventory (HUID-tagged pieces)
- Stock (non-serialized catalogue items)
- Metal exchange (old gold buy-back)
- Analytics and AI-powered business review

### 1.2 Users

| Role | Description |
|------|-------------|
| `admin` | Platform super-admin. Manages all stores. |
| `manager` | Store manager. Full store access, reports, analytics. |
| `staff` | Sales staff. Customer CRUD, transactions, girvi, orders. |
| `customer` | Customer self-service portal. View invoices, orders, profile. |

### 1.3 Technology Summary

| Concern | Technology |
|---------|-----------|
| Backend framework | FastAPI (Python 3.9) |
| ORM | SQLAlchemy 1.4 |
| Database | MySQL 8 (via PyMySQL) |
| Migrations | Alembic 1.13.1 |
| Auth | JWT HS256 + bcrypt |
| Frontend framework | React 19 + React Router v6 |
| Styling | Tailwind CSS |
| Icons | Heroicons |
| i18n | Custom LanguageContext (English + Hindi) |
| Server | Uvicorn (ASGI) |
| File storage | Local filesystem (`/uploads/`) |
| Containerisation | Docker + Docker Compose |

---

## 2. Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT TIER                            │
│                                                                 │
│   ┌─────────────────────┐      ┌────────────────────────────┐  │
│   │  React SPA          │      │  Customer Self-Service     │  │
│   │  (Port 3000)        │      │  Portal (/customer/*)      │  │
│   │  Staff / Admin UI   │      │  (same React app)          │  │
│   └─────────┬───────────┘      └──────────────┬─────────────┘  │
└─────────────┼────────────────────────────────┼─────────────────┘
              │  HTTP/JSON (Bearer JWT)          │
              ▼                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API TIER                               │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  FastAPI Application  (Port 8000)                       │  │
│   │                                                         │  │
│   │  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐  │  │
│   │  │  CORS        │  │ Auth        │  │ Error         │  │  │
│   │  │  Middleware  │  │ Logging MW  │  │ Handlers      │  │  │
│   │  └──────────────┘  └─────────────┘  └───────────────┘  │  │
│   │                                                         │  │
│   │  ┌──────────────────────────────────────────────────┐   │  │
│   │  │  Routers (25 route modules)                      │   │  │
│   │  │  /api/auth  /api/customer  /api/transactions ... │   │  │
│   │  └──────────────────────────────────────────────────┘   │  │
│   │                                                         │  │
│   │  ┌─────────────┐  ┌────────────┐  ┌─────────────────┐  │  │
│   │  │  Controllers│  │  Services  │  │  Utils          │  │  │
│   │  │  (business  │  │  (pdf,     │  │  (audit, gst,   │  │  │
│   │  │   logic)    │  │   push,    │  │   logger, auth) │  │  │
│   │  │             │  │   ai)      │  │                 │  │  │
│   │  └─────────────┘  └────────────┘  └─────────────────┘  │  │
│   │                                                         │  │
│   │  ┌──────────────────────────────────────────────────┐   │  │
│   │  │  SQLAlchemy ORM  →  27 Models                    │   │  │
│   │  └──────────────────────────────────────────────────┘   │  │
│   └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATA TIER                               │
│                                                                 │
│   ┌──────────────────────┐   ┌───────────────────────────────┐ │
│   │  MySQL 8             │   │  Local Filesystem             │ │
│   │  customer_management │   │  /uploads/store_logos/        │ │
│   │  _app               │   │  /uploads/girvi_photos/        │ │
│   │  (27 tables)         │   │                               │ │
│   └──────────────────────┘   └───────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Multi-Tenancy Design

**Tenant = Store**. Every data table that belongs to a store carries a `store_id` foreign key. The `dependencies.py` module injects the current store from the JWT token's `store_id` claim, and all queries filter by it.

```
JWT token payload:
  {
    "sub": "user@email.com",
    "user_id": 5,
    "role": "staff",
    "store_id": 2,          ← tenant isolation key
    "is_active": true
  }
```

**Admin bypass:** Users with `role == "admin"` and `store_id == null` can query any store.

### 2.3 Request Lifecycle

```
HTTP Request
    │
    ▼
CORSMiddleware          (allows localhost:3000)
    │
    ▼
AuthLoggingMiddleware   (logs every request + response status)
    │
    ▼
Router → Dependency Injection
    │         ├── get_db()          → SQLAlchemy Session
    │         ├── require_staff()   → decode JWT, check role
    │         └── get_current_store() → resolve Store from store_id
    ▼
Route Handler
    │
    ▼
Controller / direct DB query
    │
    ▼
Pydantic schema serialization
    │
    ▼
JSONResponse
    │
    ▼
Error handlers (HTTPException → standard envelope)
```

---

## 3. Backend Design

### 3.1 Directory Structure

```
backend/
├── main.py                    # FastAPI app, middleware, route registration
├── dependencies.py            # RBAC dependency functions, JWT injection
├── db_ensure_schema.py        # Additive ALTER TABLE patches (legacy compat)
│
├── config/
│   └── database.py            # SQLAlchemy engine + SessionLocal + Base
│
├── models/                    # SQLAlchemy ORM models (27 tables)
│   ├── __init__.py            # Imports all models (required for Alembic)
│   ├── user_model.py
│   ├── store.py
│   ├── customer.py
│   ├── transactional.py       # Transaction model
│   ├── transaction_line.py
│   ├── payment.py
│   ├── invoice.py
│   ├── girvi_loan.py          # GirviLoan + GirviPhoto + GirviInterestPayment
│   ├── order_repair.py        # Order model
│   ├── order_step.py          # OrderStep (workflow steps per order)
│   ├── workflow_template.py   # WorkflowTemplate + WorkflowTemplateStep
│   ├── inventory_piece.py     # InventoryPiece (serialized, HUID-tagged)
│   ├── piece_lifecycle.py     # PieceLifecycleEvent
│   ├── stock_item.py          # StockItem + StockCategory + StockMovement
│   ├── karigar.py             # Karigar (artisan/craftsman)
│   ├── metal_exchange.py      # MetalExchange
│   ├── rates_config.py        # RatesConfig (gold/silver rates)
│   ├── audit_log.py           # AuditLog
│   ├── idempotency.py         # IdempotencyKey
│   ├── push_token.py          # PushToken (FCM)
│   ├── customer_invite.py     # CustomerInvite
│   └── password_reset_token.py
│
├── routes/                    # FastAPI APIRouter modules (25 route files)
│   ├── auth.py                # /api/auth/*
│   ├── customer.py            # /api/customer/*
│   ├── transactional_route.py # /api/transactions/*
│   ├── stores.py              # /api/stores/*
│   ├── girvi.py               # /api/girvi/*
│   ├── orders.py              # /api/orders/*
│   ├── workflow_templates.py  # /api/workflow-templates/*
│   ├── payments.py            # /api/payments/*
│   ├── inventory.py           # /api/inventory/*
│   ├── stock.py               # /api/stock/*
│   ├── karigars.py            # /api/karigars/*
│   ├── metal_exchange.py      # /api/metal-exchange/*
│   ├── metal_rates.py         # /api/metal-rates/*
│   ├── gst.py                 # /api/gst/*
│   ├── analytics.py           # /api/analytics/*
│   ├── dashboard.py           # /api/dashboard/*
│   ├── insights.py            # /api/insights/*
│   ├── ai_business.py         # /api/ai/*
│   ├── admin.py               # /api/admin/*
│   ├── history.py             # /api/history/*
│   ├── reminders.py           # /api/reminders/*
│   ├── notifications.py       # /api/notifications/*
│   ├── workers.py             # /api/workers/*
│   ├── customer_details.py    # customer detail sub-routes
│   └── customer_portal.py     # customer self-service portal
│
├── controllers/               # Business logic separated from route handlers
│   ├── auth_controller.py
│   ├── customer_controller.py
│   └── transaction_controller.py
│
├── schemas/                   # Pydantic request/response models (validation)
│   ├── customer_schema.py
│   ├── girvi_schema.py
│   ├── gst_schema.py
│   ├── inventory_schema.py
│   ├── invoice_schema.py
│   ├── karigar_schema.py
│   ├── metal_exchange_schema.py
│   ├── order_schema.py
│   ├── rates_schema.py
│   ├── stock_schema.py
│   ├── store_schema.py
│   ├── transaction_schema.py
│   └── user_schema.py
│
├── services/                  # Standalone service modules
│   ├── business_ai_review.py  # AI-powered business snapshot analysis
│   ├── business_snapshot.py   # Builds data snapshot for AI input
│   ├── notification.py        # Push / notification delivery
│   ├── order_notifications.py # Order status change notifications
│   ├── piece_lifecycle.py     # InventoryPiece state machine
│   └── push.py                # FCM push token management
│
├── middleware/
│   └── auth_middleware.py     # AuthLoggingMiddleware (logs all requests)
│
├── utils/
│   ├── auth_utils.py          # JWT encode/decode, bcrypt helpers
│   ├── audit.py               # Write to audit_log table
│   ├── activity.py            # Activity feed helpers
│   ├── gst_utils.py           # GST computation (CGST/SGST/IGST)
│   ├── pdf_invoice.py         # PDF invoice generation
│   ├── rate_limit.py          # Rate limiting helpers
│   ├── logger.py              # Structured JSON logger
│   └── errors.py              # ErrorCode enum + make_error_body()
│
├── core/
│   ├── __init__.py
│   └── db_filters.py          # Common SQLAlchemy filter helpers
│
├── alembic/                   # Database migration system
│   ├── env.py                 # Migration environment (connects models to DB)
│   ├── alembic.ini            # Alembic configuration
│   └── versions/
│       ├── 20260506_e135c148c311_baseline_schema.py   (marker)
│       └── 20260506_93f2a9dad5a8_align_indexes_and_fks.py
│
├── tests/                     # Pytest test suite
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_customers.py
│   ├── test_transactions.py
│   ├── test_payments.py
│   ├── test_stores.py
│   ├── test_admin.py
│   ├── test_history.py
│   └── test_metal_rates.py
│
└── requirements.txt           # Python dependencies
```

### 3.2 Key Design Patterns

**Dependency Injection (FastAPI `Depends`)**
Every route declares its requirements; FastAPI resolves them:
```python
@router.get("/")
async def list_customers(
    db: Session = Depends(get_db),             # DB session
    payload: dict = Depends(require_staff),    # auth + role check
):
```

**Pydantic Schema Separation**
- `*Create` schema — incoming request body (validation)
- `*Response` / `*Out` schema — outgoing response (serialization)
- `*Update` schema — PATCH payloads (all fields optional)

**Standardised Error Envelope**
All errors return:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Customer not found",
    "path": "/api/customer/99",
    "details": null
  }
}
```

**Idempotency Keys**
The `idempotency` table tracks request keys to prevent duplicate writes on retry. Used in payment and transaction creation endpoints.

---

## 4. Data Model (Database Design)

### 4.1 Entity Relationship Overview

```
stores (tenant root)
  ├── users (staff/managers, store_id FK)
  ├── customers (store_id FK)
  │     ├── transactions (customer_id FK, store_id FK)
  │     │     ├── transaction_lines (transaction_id FK)
  │     │     ├── payments (transaction_id FK)
  │     │     └── invoices (transaction_id FK, 1:1)
  │     ├── girvi_loans (customer_id FK, store_id FK)
  │     │     ├── girvi_photos (loan_id FK)
  │     │     └── girvi_interest_payments (loan_id FK)
  │     ├── metal_exchanges (customer_id FK, store_id FK)
  │     └── orders (customer_id FK, store_id FK)
  │           └── order_steps (order_id FK)
  ├── inventory_pieces (store_id FK)
  │     ├── transaction_lines (piece_id FK)
  │     └── piece_lifecycle_events (piece_id FK)
  ├── stock_categories (store_id FK)
  │     └── stock_items (category_id FK, store_id FK)
  │           └── stock_movements (item_id FK)
  ├── karigars (store_id FK)
  ├── workflow_templates (store_id FK)
  │     └── workflow_template_steps (template_id FK)
  ├── rates_config (store_id FK)
  └── audit_log (store_id FK)
```

### 4.2 Core Tables

#### `stores`
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK | |
| name | VARCHAR(255) | Store display name |
| gstin | VARCHAR(20) | GST Identification Number |
| customer_code | VARCHAR(50) UNIQUE | Shared code for staff self-registration |
| state_code | VARCHAR(3) | For IGST vs CGST/SGST determination |
| invoice_prefix | VARCHAR(6) | e.g. "GP" for invoice numbering |
| invoice_seq_current | INT | Auto-incrementing invoice sequence |
| default_hsn_gold | VARCHAR(10) | Default HSN for gold items (7113) |
| default_hsn_silver | VARCHAR(10) | Default HSN for silver (7114) |
| default_hsn_making | VARCHAR(10) | Making charges HSN (9988) |
| default_hsn_diamond | VARCHAR(10) | Diamond HSN (7102) |
| is_active | BOOL | |
| logo_url | VARCHAR(500) | Uploaded logo path |

#### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK | |
| email | VARCHAR(100) UNIQUE | Login credential |
| hashed_password | VARCHAR(200) | bcrypt hash |
| role | VARCHAR(20) | admin / manager / staff / customer |
| store_id | INT FK → stores | Tenant assignment (null for admin) |
| customer_id | INT FK → customers | Set for customer-role users |
| is_active | BOOL | Deactivated users are rejected at JWT verification |
| designation | VARCHAR(100) | e.g. "Sales Executive" |
| monthly_pay | FLOAT | For payroll reference |
| join_date | DATE | |

#### `customers`
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK | |
| store_id | INT FK → stores | Tenant isolation |
| name | VARCHAR(255) | |
| primary_phone | VARCHAR(20) | Primary contact (searchable) |
| pan_encrypted | VARCHAR(500) | AES-encrypted PAN number |
| aadhaar_encrypted | VARCHAR(500) | AES-encrypted Aadhaar |
| preferences | JSON | Free-form preference data |
| is_active | BOOL | Soft delete flag |

#### `transactions`
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK | |
| store_id | INT FK → stores | |
| customer_id | INT FK → customers | |
| grand_total | FLOAT | Total bill amount |
| paid_amount | FLOAT | Amount paid at billing |
| due_amount | FLOAT | Outstanding balance |
| payment_mode | VARCHAR(50) | cash / UPI / card / cheque |
| invoice_number | VARCHAR(30) UNIQUE | e.g. "GP-2026-001" |
| gst_computed | BOOL | True = GST fields are populated |
| tax_rate | FLOAT | Item GST rate (default 3%) |
| making_tax_rate | FLOAT | Making charges GST rate (default 5%) |
| cgst_amount | FLOAT | Intra-state CGST |
| sgst_amount | FLOAT | Intra-state SGST |
| igst_amount | FLOAT | Inter-state IGST |
| is_interstate | BOOL | Determines IGST vs CGST+SGST |
| products | JSON | Legacy product list blob |

#### `girvi_loans`
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK | |
| store_id | INT FK → stores | |
| customer_id | INT FK → customers | |
| jewelry_description | VARCHAR(500) | What was pledged |
| gross_weight | FLOAT | Weight in grams |
| purity | FLOAT | Purity (e.g. 22 for 22K) |
| principal_amount | FLOAT | Loan amount disbursed |
| interest_rate_per_month | FLOAT | Monthly interest % |
| start_date | DATE | Pledge date |
| status | VARCHAR(20) | active / closed / defaulted |
| closed_at | DATETIME | When redeemed |

Related: `girvi_photos` (uploaded images), `girvi_interest_payments` (monthly interest records)

#### `orders` (Repair / Custom Orders)
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK | |
| store_id, customer_id | INT FK | |
| type | VARCHAR(20) | repair / custom / sizing |
| status | VARCHAR(30) | pending / in_progress / ready / delivered |
| karigar_id | INT FK → karigars | Assigned artisan |
| workflow_template_id | INT FK | Optional workflow |
| advance_cash | FLOAT | Advance payment |
| advance_metal_weight | FLOAT | Metal advance (old gold) |
| expected_date | DATE | Promised delivery date |

Related: `order_steps` (per-step progress tracking)

#### `inventory_pieces` (Serialized Pieces)
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK | |
| serial | VARCHAR(100) UNIQUE | Internal serial number |
| huid | VARCHAR(20) | BIS Hallmark Unique ID |
| metal_type | VARCHAR(50) | gold / silver / platinum |
| gross_weight | FLOAT | |
| net_weight | FLOAT | |
| purity | FLOAT | |
| status | VARCHAR(30) | in_stock / with_karigar / on_hold / sold |
| karigar_id | INT FK | If currently with a karigar |
| store_id | INT FK | |

Related: `piece_lifecycle_events` (full audit trail of piece movement)

#### `stock_items` (Non-Serialized Stock)
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK | |
| store_id | INT FK | |
| category_id | INT FK → stock_categories | |
| name | VARCHAR(200) | Item name |
| sku | VARCHAR(100) | |
| quantity | FLOAT | Current quantity |
| unit | VARCHAR(20) | pcs / grams / kg |
| reorder_level | FLOAT | Alert threshold |
| cost_price | FLOAT | |
| selling_price | FLOAT | |

Related: `stock_movements` (in/out quantity adjustments), `stock_categories`

#### `workflow_templates`
Reusable workflow definitions for order types (e.g. "Necklace Repair" has 5 steps).

| Column | Type | Description |
|--------|------|-------------|
| id | INT PK | |
| store_id | INT FK | |
| name | VARCHAR(200) | Template name |
| order_type | VARCHAR(20) | repair / custom |
| created_at | DATETIME | |

Related: `workflow_template_steps` (ordered step definitions per template), `order_steps` (per-order instantiated steps)

#### `karigars` (Artisans)
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK | |
| store_id | INT FK | |
| name | VARCHAR(200) | |
| phone | VARCHAR(20) | |
| specialization | VARCHAR(100) | e.g. "Stone Setting" |
| is_active | BOOL | |

#### `audit_log`
Every significant create/update/delete action is recorded:
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK | |
| store_id | INT FK | |
| user_id | INT | Who performed the action |
| entity_type | VARCHAR(50) | customer / transaction / girvi_loan / etc. |
| entity_id | INT | ID of the affected record |
| action | VARCHAR(20) | create / update / delete |
| old_values | JSON | Before state |
| new_values | JSON | After state |
| created_at | DATETIME | |

### 4.3 Migration History

```
<base>
  └── e135c148c311  baseline_schema        (May 6, 2026) — marker only
        └── 93f2a9dad5a8  align_indexes_and_fks   (May 6, 2026) [HEAD]
```

Schema is managed by Alembic. **Never** manually alter the database.

---

## 5. API Reference Summary

All endpoints are prefixed with `/api`. Full interactive docs at `http://localhost:8000/api/docs`.

### 5.1 Authentication — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/login` | None | Login with email + password → JWT + refresh token |
| POST | `/register` | None | Register new user (staff/manager via store code) |
| POST | `/refresh` | Refresh token | Get new access token |
| POST | `/logout` | Bearer | Invalidate session |
| POST | `/forgot-password` | None | Send reset email |
| POST | `/reset-password` | None | Set new password with reset token |
| GET | `/me` | Bearer | Get current user profile |
| PUT | `/me` | Bearer | Update profile |

**JWT Payload:**
```json
{
  "sub": "user@email.com",
  "user_id": 5,
  "role": "staff",
  "store_id": 2,
  "is_active": true,
  "exp": 1234567890
}
```

### 5.2 Customers — `/api/customer`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | staff | List all customers (store-scoped) |
| POST | `/` | staff | Create customer |
| GET | `/{id}` | staff | Get customer detail |
| PUT | `/{id}` | staff | Update customer |
| DELETE | `/{id}` | manager | Soft-delete customer |
| GET | `/{id}/transactions` | staff | Customer transaction history |
| GET | `/{id}/girvi` | staff | Customer girvi loans |
| GET | `/{id}/orders` | staff | Customer orders |
| GET | `/{id}/payments` | staff | Payment history |
| POST | `/import` | manager | CSV bulk import |

### 5.3 Transactions — `/api/transactions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | staff | List transactions |
| POST | `/` | staff | Create transaction (sale/purchase) |
| GET | `/{id}` | staff | Transaction detail |
| PUT | `/{id}` | staff | Update transaction |
| GET | `/{id}/pdf` | staff | Download GST invoice PDF |
| POST | `/{id}/gst-compute` | staff | Compute and attach GST breakdown |

### 5.4 Girvi (Gold Loans) — `/api/girvi`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | staff | List all active loans |
| POST | `/` | staff | Create new pledge loan |
| GET | `/{id}` | staff | Loan detail |
| PUT | `/{id}` | staff | Update loan |
| POST | `/{id}/close` | staff | Mark as redeemed |
| POST | `/{id}/interest-payment` | staff | Record monthly interest payment |
| POST | `/{id}/photos` | staff | Upload pledge photos |
| GET | `/due` | staff | Loans with interest due |

### 5.5 Orders (Repair / Custom) — `/api/orders`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | staff | List orders (filterable by status, karigar) |
| POST | `/` | staff | Create order |
| GET | `/{id}` | staff | Order detail with steps |
| PUT | `/{id}` | staff | Update order |
| POST | `/{id}/steps/{step_id}/complete` | staff | Mark a step as done |
| POST | `/{id}/deliver` | staff | Mark order as delivered |

### 5.6 Inventory (Serialized Pieces) — `/api/inventory`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | staff | List pieces (filter by status, metal, karigar) |
| POST | `/` | staff | Add new piece |
| GET | `/{serial}` | staff | Piece detail + lifecycle history |
| PUT | `/{id}` | staff | Update piece |
| POST | `/{id}/assign-karigar` | staff | Send piece to karigar |
| POST | `/{id}/return-karigar` | staff | Receive back from karigar |
| GET | `/{id}/lifecycle` | staff | Full movement history |

### 5.7 Stock (Non-Serialized) — `/api/stock`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/items` | staff | List stock items |
| POST | `/items` | staff | Create stock item |
| PUT | `/items/{id}` | staff | Update |
| POST | `/items/{id}/adjust` | staff | Record stock movement (in/out) |
| GET | `/movements` | staff | Movement history |
| GET | `/low-stock` | staff | Items below reorder level |
| GET | `/categories` | staff | List categories |

### 5.8 GST — `/api/gst`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/reports` | manager | GST summary report (date range) |
| GET | `/reports/gstr1` | manager | GSTR-1 format export |
| GET | `/invoice/{id}` | staff | GST invoice detail |

### 5.9 Analytics — `/api/analytics`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/summary` | manager | KPI summary (revenue, customers, etc.) |
| GET | `/revenue` | manager | Revenue breakdown by period |
| GET | `/export/customers` | manager | Export customer list (xlsx) |
| GET | `/export/transactions` | manager | Export transaction data |

### 5.10 AI Business Review — `/api/ai`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/review` | manager | Generate AI-powered business health analysis |
| GET | `/snapshot` | manager | Get current business data snapshot |

### 5.11 Admin — `/api/admin`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stores` | admin | List all stores |
| POST | `/stores` | admin | Create new store |
| GET | `/users` | admin | List all users |
| GET | `/audit-log` | admin | View audit trail |

### 5.12 Customer Portal — `/api/customer-portal`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/login` | None | Customer portal login |
| GET | `/profile` | customer JWT | View own profile |
| GET | `/invoices` | customer JWT | View own invoices |
| GET | `/orders` | customer JWT | View own repair orders |
| POST | `/join` | None | Join a store via store code |

### 5.13 Other Endpoints

| Module | Prefix | Key Endpoints |
|--------|--------|---------------|
| Metal Rates | `/api/metal-rates` | CRUD for gold/silver rates |
| Metal Exchange | `/api/metal-exchange` | Buy-back / exchange records |
| Karigars | `/api/karigars` | Artisan CRUD |
| Workflow Templates | `/api/workflow-templates` | Template CRUD |
| Workers | `/api/workers` | Staff management |
| Payments | `/api/payments` | Payment records |
| Reminders | `/api/reminders` | Payment/girvi reminders |
| Notifications | `/api/notifications` | Push notification management |
| History | `/api/history` | Activity feed |
| Insights | `/api/insights` | Business insights |
| Dashboard | `/api/dashboard` | Dashboard summary data |
| Stores | `/api/stores` | Store settings |

---

## 6. Authentication & Authorization

### 6.1 Login Flow

```
POST /api/auth/login
  ├── Verify email + password (bcrypt.checkpw)
  ├── Check user.is_active == True
  ├── Build JWT payload (sub, user_id, role, store_id, is_active)
  ├── Sign with HS256 + JWT_SECRET_KEY (expire: 60 min default)
  ├── Generate refresh token (separate secret, longer expiry)
  └── Return {"token": "...", "refresh_token": "..."}
```

### 6.2 Request Authorization Flow

```
Bearer token in Authorization header
  │
  ▼
security = HTTPBearer()
  │
  ▼
verify_token(token)  →  decode JWT, check expiry
  │
  ▼
get_token_payload()  →  returns payload dict
  │
  ▼
Role check (require_staff / require_manager / require_admin)
  │
  ▼
Route handler receives payload
```

### 6.3 RBAC Permission Matrix

| Operation | admin | manager | staff | customer |
|-----------|:-----:|:-------:|:-----:|:--------:|
| Manage stores / users | ✓ | | | |
| View all stores | ✓ | | | |
| Analytics & Reports | ✓ | ✓ | | |
| Customer CRUD | ✓ | ✓ | ✓ | |
| Transactions / Girvi / Orders | ✓ | ✓ | ✓ | |
| Inventory / Stock | ✓ | ✓ | ✓ | |
| Customer portal (own data) | | | | ✓ |

### 6.4 Key Security Files

| File | Purpose |
|------|---------|
| `utils/auth_utils.py` | `create_token()`, `verify_token()`, `hash_password()`, `verify_password()` |
| `dependencies.py` | `require_admin`, `require_manager`, `require_staff`, `require_customer` |
| `middleware/auth_middleware.py` | `AuthLoggingMiddleware` — logs all requests with user context |
| `models/password_reset_token.py` | One-time password reset tokens |
| `models/idempotency.py` | Idempotency key table (prevent duplicate writes) |

---

## 7. Frontend Design

### 7.1 Application Structure

```
frontend/src/
├── App.js                    # Root router — all route definitions
├── api.js                    # Axios instance + interceptors (auto-attach Bearer)
├── index.js                  # React DOM render entry point
│
├── context/
│   └── LanguageContext.jsx   # Hindi/English toggle (localStorage persistent)
│
├── i18n/
│   └── translations.js       # English + Hindi string map
│
├── components/
│   ├── ProtectedRoute.jsx    # Redirects to /login if no token
│   ├── layout/
│   │   └── ShopLayout.jsx    # Sidebar + top nav shell
│   ├── shop/
│   │   ├── CustomerSelectionStep.jsx
│   │   └── GSTPanel.jsx      # GST calculation UI panel
│   └── ui/                   # Reusable UI components
│       ├── Button.jsx
│       ├── Input.jsx
│       ├── Select.jsx
│       ├── Modal.jsx
│       ├── DataTable.jsx
│       ├── AutoForm.jsx       # Schema-driven form generator
│       ├── AddCustomer.jsx
│       ├── BuyProduct.jsx
│       ├── CustomerSelectWithAdd.jsx
│       ├── ConfirmationPop.jsx
│       └── LogoUploader.jsx
│
├── pages/
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── ForgotPassword.jsx / ResetPassword.jsx
│   ├── DashboardPage.jsx      # Main staff dashboard
│   ├── AdminDashboard.jsx     # Admin-only view
│   ├── CustomerDashboard.jsx  # Customer list + search
│   ├── AddCustomerPage.jsx
│   ├── ShopPage.jsx           # POS / billing interface
│   ├── PaymentsPage.jsx
│   ├── WorkersPage.jsx        # Staff management
│   ├── RemindersPage.jsx
│   ├── ImportCustomersPage.jsx
│   ├── UploadBillPage.jsx
│   ├── ChartsDashboard.jsx
│   ├── DailySalesPage.jsx
│   ├── GSTReportsPage.jsx
│   ├── JewelleryBusinessDashboard.jsx
│   ├── ActivityHistoryPage.jsx
│   ├── StoreDetailPage.jsx
│   │
│   ├── girvi/
│   │   ├── GirviPage.jsx          # Loan list
│   │   ├── GirviNewPage.jsx       # Create loan
│   │   └── GirviDetailPage.jsx    # Loan detail + interest payments
│   │
│   ├── orders/
│   │   ├── OrdersPage.jsx
│   │   ├── OrdersNewPage.jsx
│   │   ├── OrderDetailPage.jsx    # Step-by-step workflow view
│   │   ├── WorkflowTemplatesPage.jsx
│   │   └── WorkflowTemplateEditPage.jsx
│   │
│   ├── inventory/
│   │   ├── InventoryPiecesPage.jsx
│   │   ├── InventoryPieceNewPage.jsx
│   │   └── InventoryPieceDetailPage.jsx
│   │
│   ├── stock/
│   │   ├── StockPage.jsx
│   │   ├── StockNewItemPage.jsx
│   │   ├── StockEditItemPage.jsx
│   │   ├── StockMovementsPage.jsx
│   │   └── StockLowStockPage.jsx
│   │
│   ├── metal-exchange/
│   │   ├── MetalExchangePage.jsx
│   │   ├── MetalExchangeNewPage.jsx
│   │   ├── MetalExchangeAdvancePage.jsx
│   │   └── MetalRatesPage.jsx
│   │
│   ├── karigars/
│   │   └── KarigarsPage.jsx
│   │
│   ├── insights/
│   │   └── InsightsPage.jsx
│   │
│   └── customer-portal/           # Separate mini-app for customers
│       ├── CustomerPortalLogin.jsx
│       ├── CustomerJoin.jsx        # Join store via code
│       ├── CustomerPortalLayout.jsx
│       ├── CustomerPortalDashboard.jsx
│       ├── CustomerProfile.jsx
│       ├── CustomerInvoices.jsx
│       └── CustomerOrders.jsx
│
├── constants/
│   └── shopMenu.js               # Sidebar navigation menu definition
│
└── utils/
    ├── format.js                 # Date/currency formatting helpers
    ├── productCalculations.js    # Price + GST calculations
    └── customerPayload.js        # Customer form data normalizer
```

### 7.2 Routing Structure

```
/ → Login
/login → Login
/register → Register
/forgot-password → ForgotPassword
/reset-password → ResetPassword

/customer/login → CustomerPortalLogin
/customer/join → CustomerJoin
/customer/* → CustomerPortalLayout (requires customer JWT)
  /customer/dashboard → CustomerPortalDashboard
  /customer/profile → CustomerProfile
  /customer/invoices → CustomerInvoices
  /customer/orders → CustomerOrders

/* → ProtectedRoute (requires staff/admin JWT)
  /customerDashboard → CustomerDashboard
  /addCustomer → AddCustomerPage
  /customer/:id → AccountDetails
  /dashboard → DashboardPage
  /admin → AdminDashboard
  /store/:id → StoreDetailPage
  /shop → ShopPage (POS)
  /charts → ChartsDashboard
  /workers → WorkersPage
  /payments → PaymentsPage
  /reminders → RemindersPage
  /girvi → GirviPage
  /girvi/new → GirviNewPage
  /girvi/:id → GirviDetailPage
  /metal-exchange → MetalExchangePage
  /orders → OrdersPage
  /orders/new → OrdersNewPage
  /orders/:id → OrderDetailPage
  /stock → StockPage
  /inventory → InventoryPiecesPage
  /karigars → KarigarsPage
  /gst-reports → GSTReportsPage
  /insights → InsightsPage
  /activity → ActivityHistoryPage
  /business-dashboard → JewelleryBusinessDashboard
```

### 7.3 API Client (`api.js`)

Centralized Axios instance:
- Base URL: `http://localhost:8000`
- Request interceptor: attaches `Authorization: Bearer <token>` from `localStorage`
- Response interceptor: redirects to `/login` on 401

### 7.4 i18n (Internationalisation)

- **Provider:** `LanguageContext.jsx` wraps the entire app
- **Languages:** English (`en`) + Hindi (`hi`)
- **Persistence:** `localStorage.setItem('language', ...)`
- **Usage:** `const { t } = useLanguage(); t('customers')` → "Customers" or "ग्राहक"
- **Toggle UI:** `LanguageSwitcher.jsx` component in nav

---

## 8. Business Domain Logic

### 8.1 GST Invoice Computation

**Logic in:** `utils/gst_utils.py`, `routes/gst.py`, `components/shop/GSTPanel.jsx`

```
Determine transaction type:
  if seller_state == buyer_state → CGST + SGST (intra-state)
  if seller_state != buyer_state → IGST (inter-state)

Item tax (gold/jewellery):
  CGST = taxable_value × (tax_rate/2) / 100
  SGST = taxable_value × (tax_rate/2) / 100
  IGST = taxable_value × tax_rate / 100

Making charges tax:
  CGST = making_charges × (making_tax_rate/2) / 100
  SGST = making_charges × (making_tax_rate/2) / 100

Invoice number generation:
  "{prefix}-{YYYY}-{seq:03d}"  e.g. "GP-2026-042"
  invoice_seq_current incremented atomically on the stores table
```

HSN Codes (India):
- Gold jewellery: `7113`
- Silver jewellery: `7114`
- Making charges: `9988`
- Diamonds: `7102`

### 8.2 Girvi (Gold Loan) Interest

**Logic in:** `routes/girvi.py`, `GirviDetailPage.jsx`

```
Monthly interest = principal_amount × interest_rate_per_month / 100

Overdue detection:
  If last payment month < current month → interest is due
  Alert shown on GirviInterestDuePage

Loan closure:
  status = "closed"
  closed_at = now()
  All outstanding interest must be paid or waived
```

### 8.3 Inventory Piece Lifecycle

**States:** `in_stock → with_karigar → in_stock → sold`

Managed by `services/piece_lifecycle.py`:

```
State transitions:
  in_stock      → assign_karigar   → with_karigar
  with_karigar  → return_karigar   → in_stock
  in_stock      → sell (via txn)   → sold
  in_stock      → hold             → on_hold
  on_hold       → release          → in_stock

Every transition writes a PieceLifecycleEvent record.
```

### 8.4 Order Workflow

**Logic in:** `routes/orders.py`, `OrderDetailPage.jsx`

```
1. Create Order → optionally attach WorkflowTemplate
2. WorkflowTemplateSteps are cloned into OrderSteps
3. Staff marks steps complete in sequence
4. When all steps done → status = "ready"
5. Customer notified (push notification)
6. Staff marks as "delivered"
```

Step bypass is supported for steps that don't apply to a specific job.

### 8.5 Metal Exchange (Old Gold Buy-Back)

Customers bring old jewellery to exchange toward a new purchase. Records:
- Item description, weight, purity
- Assessed value
- Exchange rate used
- Link to resulting transaction (if applied)

### 8.6 AI Business Review

**Logic in:** `services/business_ai_review.py`, `services/business_snapshot.py`

```
1. business_snapshot.py aggregates:
   - Revenue (last 30/90 days)
   - Top customers by spend
   - Active girvi loans count + total principal
   - Order completion rates
   - Inventory turnover

2. Snapshot sent to OpenAI / LLM API with structured prompt

3. Returns:
   - Business health score
   - Top 3 strengths
   - Top 3 risks
   - Recommended actions
```

---

## 9. Cross-Cutting Concerns

### 9.1 Logging

**Structured JSON logging** via `utils/logger.py`:
```json
{
  "ts": "2026-05-09T05:44:30Z",
  "level": "INFO",
  "event": "startup",
  "message": "Customer Management API started successfully",
  "version": "1.0.0"
}
```

Log files:
- `backend/logs/app.log` — application events
- `backend/logs/requests.log` — HTTP request log (from AuthLoggingMiddleware)

### 9.2 Audit Trail

Every CRUD operation on sensitive entities writes to `audit_log`:
- **Who:** `user_id` from JWT
- **What:** `entity_type` + `entity_id`  
- **When:** `created_at`
- **Before/After:** `old_values` / `new_values` JSON

Utility: `utils/audit.py` → `log_audit(db, user_id, entity_type, entity_id, action, old, new)`

### 9.3 File Uploads

Uploaded files are stored locally under `backend/uploads/`:
- `uploads/store_logos/` — store branding logos
- `uploads/girvi_photos/` — pledged item photographs

Served as static files: `GET /uploads/girvi_photos/xyz.jpg`

**Gap:** No cloud storage (S3/GCS). Local disk is lost on server replacement.

### 9.4 Push Notifications

`services/push.py` + `models/push_token.py` — FCM (Firebase Cloud Messaging):
- Tokens stored per user in `push_tokens` table
- Triggered on: order status change, girvi interest due
- `services/order_notifications.py` handles order-specific triggers

### 9.5 Error Handling

Three standardised exception handlers in `main.py`:
1. `StarletteHTTPException` → standard error envelope
2. `RequestValidationError` → 422 with per-field errors
3. `Exception` (catch-all) → 500 with internal error message, full traceback logged

Error envelope format:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "...",
    "path": "/api/...",
    "details": null
  }
}
```

`ErrorCode` enum in `utils/errors.py` maps HTTP status codes to machine-readable codes.

### 9.6 Database Session Management

```python
# config/database.py
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

Every request gets its own session; session is closed after response (even on error).

---

## 10. Infrastructure & Deployment

### 10.1 Local Development

```bash
# Backend
cd backend
source venv/bin/activate  # (or use the venv at ../venv/)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm start   # Starts on port 3000

# Database migrations
cd backend
alembic upgrade head
```

### 10.2 Docker

**Files:**
- `docker-compose.yml` — Development stack (backend + frontend + MySQL)
- `docker-compose.prod.yml` — Production stack
- `backend/Dockerfile`
- `frontend/Dockerfile`

```yaml
# docker-compose.yml (simplified)
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: mysql+pymysql://root:root@db:3306/customer_management_app

  frontend:
    build: ./frontend
    ports: ["3000:80"]

  db:
    image: mysql:8
    volumes:
      - mysql_data:/var/lib/mysql
```

### 10.3 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | hardcoded (dev) | MySQL connection string |
| `JWT_SECRET_KEY` | Yes | hardcoded (dev) | JWT signing secret |
| `JWT_ALGORITHM` | No | `HS256` | JWT algorithm |
| `JWT_EXPIRE_MINUTES` | No | `60` | Token lifetime |
| `ENV` | No | `development` | `development` / `production` |
| `CORS_ORIGINS` | No | `localhost:3000` | Allowed CORS origins |

⚠️ **Current state:** `DATABASE_URL` and `JWT_SECRET_KEY` are hardcoded in `config/database.py` and `utils/auth_utils.py`. SEC-02 task will fix this.

### 10.4 Database Backup

**Not automated.** Manual procedure:
```bash
mysqldump -u root -proot@123 customer_management_app | gzip > backup_$(date +%Y%m%d).sql.gz
```

INF-01 task will add automated daily backups.

---

## 11. Known Gaps & Technical Debt

### 11.1 Security Gaps (From Audit)

| ID | Severity | Issue | File |
|----|----------|-------|------|
| SEC-02 | HIGH | `DATABASE_URL` + `JWT_SECRET_KEY` hardcoded in source | `config/database.py`, `utils/auth_utils.py` |
| SEC-03 | HIGH | No rate limiting on auth endpoints | `routes/auth.py` |
| SEC-04 | MED | API docs public in all environments | `main.py` |
| SEC-05 | MED | Missing security headers (X-Frame-Options, HSTS, etc.) | `main.py` |
| SEC-06 | MED | CORS restricted to `localhost:3000` only (not configurable) | `main.py` |
| SEC-07 | LOW | `requirements.txt` uses `>=` ranges (supply chain risk) | `requirements.txt` |
| SEC-09 | MED | Girvi loan amounts not validated (no max principal, no rate cap) | `routes/girvi.py` |

### 11.2 Missing Features

| Feature | Impact | Status |
|---------|--------|--------|
| Subscription / billing tiers | **Revenue** | Not started |
| SMS / WhatsApp reminders | High | Not started |
| PDF invoice generation complete | High | Partial (util exists, not wired) |
| Pagination on list APIs | Medium | Missing — will time out at scale |
| Cloud file storage (S3) | Medium | Local disk only |
| Background task queue | Medium | Synchronous only |
| Live gold rate fetch | Medium | Manual entry only |
| Staff permissions UI | Medium | Backend roles exist, no UI |

### 11.3 Architecture Debt

| Issue | Description |
|-------|-------------|
| `db_ensure_schema.py` | Legacy `ALTER TABLE` patches still run at startup. Should be removed once all deployments are migrated via Alembic. |
| `alembic/versions/20260506_2244_d6433dc450d4_align_schema.py` | Stale migration file — was deleted but may need cleanup. |
| No `BaseModel` mixin | SQLAlchemy models don't share a `created_at`/`updated_at` mixin — each model defines timestamps manually. |
| `products` JSON column on `transactions` | Legacy blob field. New `transaction_lines` table exists but old API still writes to `products`. Dual-write creates inconsistency. |
| No caching layer | All queries hit MySQL directly. No Redis caching on hot paths (gold rates, dashboard summary). |

### 11.4 Test Coverage

| Module | Tests | Status |
|--------|-------|--------|
| Auth | `test_auth.py` | ✅ |
| Customers | `test_customers.py` | ✅ |
| Transactions | `test_transactions.py` | ✅ |
| Payments | `test_payments.py` | ✅ |
| Stores | `test_stores.py` | ✅ |
| Admin | `test_admin.py` | ✅ |
| Girvi | ❌ missing | No tests |
| Orders | ❌ missing | No tests |
| Inventory | ❌ missing | No tests |
| Stock | ❌ missing | No tests |
| GST | ❌ missing | No tests |

---

*Document generated: May 9, 2026 | Source: full codebase read of `bhavesh65321/customer_management`*
