# Bug Report – Senior Lead Test Engineer

**Scope:** P1, P2, P3, and Security bugs. UI/Styling bugs excluded.  
**Date:** As of current codebase review.

---

## P1 (Critical) – Must fix

### P1-1: Transaction can be created for another store’s customer (IDOR / data integrity)

**Location:** `backend/routes/transactional_route.py` → `save_transaction`; `backend/controllers/transaction_controller.py` → `create_transaction`.

**Description:** When creating a transaction (bill), the API accepts `customerId` from the request body but does **not** check that this customer belongs to the staff user’s store. A staff member of Store A can send `customerId` of a customer belonging to Store B; the transaction is saved with `store_id` from the JWT but `customer_id` pointing to the other store’s customer. This breaks multi-tenant isolation and can corrupt reporting and customer balances.

**Steps to reproduce:**
1. Log in as staff of Store A.
2. Call `POST /api/transactions/add` with a body that has `customerId` set to a customer that belongs to Store B.
3. Transaction is created with Store A’s `store_id` and Store B’s `customer_id`.

**Fix:** Before creating the transaction, resolve the customer by `customerId` and ensure `customer.store_id == payload.get("store_id")` (with appropriate handling when `store_id` is `None` for admin). Return 403/404 if the customer does not belong to the current store.

---

### P1-2: Staff routes accessible without login (no frontend route protection)

**Location:** `frontend/src/App.js` – all staff routes (`/home`, `/shop`, `/customerDashboard`, `/payments`, etc.) are rendered without any guard.

**Description:** If a user opens `/home`, `/girvi`, `/payments`, etc. without being logged in, the page and layout still render. API calls then return 401 and some pages redirect to login, but behaviour is inconsistent and the app shell (sidebar, menu) is visible. This is a broken access control from a UX and security perspective: the app should not expose staff UI until the user is authenticated.

**Fix:** Introduce a protected-route wrapper (e.g. `StaffLayout` or `ProtectedRoute`) that checks for a valid token (and optionally staff role). If missing, clear token, redirect to `/login`, and do not render staff routes. Apply this to all staff routes so that unauthenticated users never see the staff dashboard or sidebar.

**Note:** Girvi, Metal Exchange, and Orders create endpoints correctly validate that the customer belongs to the staff’s store. The transaction create flow is the one missing this check.

---

## P2 (High) – Should fix

### P2-1: Forgot-password API returns reset token in response

**Location:** `backend/controllers/auth_controller.py` → `forgot_password`; `backend/routes/auth.py` → `forgot_password_route`.

**Description:** The API returns `reset_token` and `reset_link` in the JSON response. If the client (or any logging/monitoring) stores or logs this response, the reset token is exposed. Reset links should be sent only via a side channel (e.g. email); the API should not return the token in the body for the same request.

**Fix:** Return a generic message only, e.g. `{"message": "If an account exists with this email, a reset link has been sent."}`. Send the actual reset link (with token) only via email (or another secure channel). Remove `reset_token` and `reset_link` from the API response.

---

### P2-2: JWT secret fallback in code

**Location:** `backend/utils/auth_utils.py`:  
`SECRET_KEY = os.getenv("SECRET_KEY", "fallback_secret_key")`

**Description:** If `SECRET_KEY` is not set in the environment, the app uses a hardcoded default. In production this would allow anyone who knows the default to forge JWTs and impersonate users.

**Fix:** In production, require `SECRET_KEY` to be set (e.g. fail startup or use a strict default that only runs in dev). Do not rely on a non-secret fallback in production.

---

### P2-3: Metal rates “current” endpoint unauthenticated

**Location:** `backend/routes/metal_rates.py` → `get_current_rates`.

**Description:** `GET /api/metal-rates/current` has no authentication (`Depends(get_db)` only). Anyone can read current metal rates. Other metal-rates endpoints are protected with `require_staff`. This is an inconsistent authorization and information disclosure.

**Fix:** Add `Depends(require_staff)` (or the appropriate auth dependency) to `get_current_rates` so that only authenticated staff can read current rates.

---

### P2-4: Inventory list returns all stores’ data when store_id not provided

**Location:** `backend/routes/inventory.py` → `list_pieces`.

**Description:** The endpoint filters by `store_id` only when the query parameter `store_id` is provided. When it is omitted, the query returns **all** inventory pieces from all stores. Staff of one store can therefore see or enumerate another store’s inventory by not sending `store_id`, breaking multi-tenant isolation.

**Fix:** Do not rely on an optional `store_id` query parameter for scoping. Use the JWT payload’s `store_id` (e.g. via `apply_store_filter` or equivalent) so that staff only see their store’s inventory. If admin users have no `store_id`, define explicit behaviour (e.g. admin can see all, or only see records with `store_id IS NULL`).

---

### P2-5: No minimum password strength

**Location:** `backend/schemas/user_schema.py` (e.g. `UserRegister`, `UserLogin`, `ResetPasswordRequest`, `AdminUserCreate`); `backend/controllers/auth_controller.py` (reset_password, register_user).

**Description:** Passwords are only required to have `min_length=1` and `max_length=256`. Weak passwords (e.g. "1", "a") are allowed, increasing the risk of brute-force and credential stuffing.

**Fix:** Enforce a minimum length (e.g. 8 characters) and optionally complexity (e.g. at least one letter and one number) in the schema and/or in the auth controller for registration and password reset.

---

### P2-6: No global 401 handling on frontend

**Location:** `frontend/src/api.js` – `apiGet`, `apiPost`, `apiPut` (and any other API helpers).

**Description:** When the backend returns 401, the frontend throws and the caller may or may not redirect to login or clear the token. There is no central place that, on 401, clears the token and redirects to `/login` (or `/customer/login` for portal). This can leave the user in an inconsistent state (e.g. expired token, still on a staff page).

**Fix:** In the shared API layer (or a fetch wrapper), on receiving 401, clear `localStorage` token and redirect to `/login` (or the correct login page based on current route). Then remove duplicate 401 handling from individual pages where possible.

---

## P3 (Medium / Nice-to-fix) – Duplicate checks, validations, data integrity

### Auth & Users

**P3-1: Admin create user (role=customer) – no check that customer already has an account**  
**Location:** `backend/routes/admin.py` → `create_user`.  
**Description:** When `role=customer`, only `customer_id` presence is validated. There is no check that (a) the customer exists, or (b) no other `User` already has this `customer_id`. So an admin can create a second login account for the same customer (e.g. duplicate portal logins).  
**Fix:** Before creating the user, verify `Customer.id == body.customer_id` exists (and optionally belongs to the store). Then check `db.query(User).filter(User.customer_id == body.customer_id).first()`; if a user exists, return 400 with a message like "This customer already has an account."

**P3-2: Admin delete user – no check for last admin**  
**Location:** `backend/routes/admin.py` → `delete_user`.  
**Description:** Any admin can delete any user, including the last admin. That can lock everyone out of admin functions.  
**Fix:** Before deleting, if `user.role == "admin"`, check that at least one other admin exists (`db.query(User).filter(User.role == "admin").count() >= 2`). If this is the last admin, return 400.

**P3-3: Duplicate user (email) – already enforced**  
**Verified:** Registration, customer invite registration, admin create user, and workers add all check for existing email. User model has `email` unique. No gap.

---

### Customers

**P3-4: Add customer – no duplicate primary_phone check within store**  
**Location:** `backend/routes/customer.py` → `add_customer`.  
**Description:** Multiple customers in the same store can be created with the same `primary_phone`. This can cause confusion in search, reminders (SMS/email), and reporting.  
**Fix:** Before inserting, check that no other **active** customer in the same store has the same `primary_phone` (normalize spaces/digits if needed). Return 400 with a clear message if duplicate.

**P3-5: Update customer – no duplicate primary_phone check**  
**Location:** `backend/routes/customer.py` → `update_customer`.  
**Description:** Updating a customer’s `primary_phone` to a number that already exists for another customer in the same store is allowed. Same downsides as P3-4.  
**Fix:** When `updated_data.primary_phone` is set, check for another customer in the same store (excluding current customer) with that phone; if found, return 400.

**P3-6: Import customers – no duplicate phone check per row**  
**Location:** `backend/routes/customer.py` → `import_customers_excel`.  
**Description:** Each row is inserted without checking if that phone already exists in the store. Import can create many customers with the same phone.  
**Fix:** For each row, before `db.add(new_customer)`, check for existing customer in the same store with same `primary_phone`. Either skip with an error in `errors` or make duplicate handling configurable (e.g. skip vs update).

**P3-7: Customer email uniqueness not enforced per store**  
**Location:** `backend/models/customer.py` (no unique constraint on email per store); `backend/routes/customer.py` (add/update do not check email).  
**Description:** Two customers in the same store can have the same email. Notifications (e.g. reminders, invoices) could be sent to the wrong person or twice.  
**Fix:** Either add a uniqueness check when adding/updating (same store + same email = 400) or add a DB constraint (e.g. unique on `(store_id, email)` where email is not null).

---

### Customer invites

**P3-8: Multiple active invites for same customer allowed**  
**Location:** `backend/routes/customer.py` → `create_invite`.  
**Description:** Staff can create many invite links for the same customer. Each link works until used or expired. There is no “one pending invite per customer” or “revoke previous” rule, which can be confusing and weakens invite semantics.  
**Fix:** Optional: before creating a new invite, invalidate or delete existing unused invites for that customer, or return 400 if an unused invite already exists and document the behaviour.

---

### Transactions & billing

**P3-9: Transaction create – no server-side check that grandTotal matches product totals**  
**Location:** `backend/controllers/transaction_controller.py` → `create_transaction`; `backend/schemas/transaction_schema.py` (TransactionCreate).  
**Description:** The API accepts `grandTotal`, `paidAmount`, `dueAmount`, and `products[].total` independently. There is no validation that `grandTotal == sum(products[].total)` or that `dueAmount == grandTotal - paidAmount`. A buggy or malicious client can store inconsistent totals.  
**Fix:** Add a validator (schema or controller) that ensures `grandTotal` equals the sum of product totals and that `dueAmount == grandTotal - paidAmount` (or that `paidAmount + dueAmount == grandTotal`).

**P3-10: Record payment – no idempotency; double submit can double-record**  
**Location:** `backend/routes/transactional_route.py` → `record_payment`.  
**Description:** If the user double-clicks or the client retries the request, the same payment can be recorded twice (amount added to `paid_amount` and a new `Payment` row each time). There is no idempotency key or duplicate-window check.  
**Fix:** Introduce idempotency (e.g. client sends `Idempotency-Key` header; server stores key + transaction_id + amount and returns the same result for repeated requests within a TTL) or at least document that clients must avoid duplicate submissions.

**P3-11: update_transaction – transaction_id type mismatch**  
**Location:** `backend/controllers/transaction_controller.py` → `update_transaction(db, transaction_id: str, ...)`; route passes `transaction_id: int`.  
**Description:** The controller signature uses `transaction_id: str` but the route passes an int. It works at runtime but is misleading and can cause issues if the ID is ever passed as a string from another layer.  
**Fix:** Change the controller parameter to `transaction_id: int` for consistency with the route and DB.

---

### Stores (admin)

**P3-12: Create store – no duplicate name or contact_phone check**  
**Location:** `backend/routes/admin.py` → `create_store_admin`.  
**Description:** Two stores can be created with the same name or the same contact phone. `resolve_store_from_identifier` uses contact_phone for lookup; duplicates can make resolution ambiguous.  
**Fix:** Optionally enforce unique store name and/or contact_phone (or at least warn in admin UI). If uniqueness is not desired, document the behaviour.

**P3-13: Delete store – no check for existing data**  
**Location:** `backend/routes/admin.py` → `delete_store_admin`.  
**Description:** Deleting a store does not check for existing transactions, customers, users, payments, etc. Depending on DB constraints, the delete may fail with an FK error or leave orphans if FKs are set to SET NULL.  
**Fix:** Before deleting, check for related records (transactions, customers, users, etc.). Either forbid delete and return 400 with a clear message, or implement a proper cascade/archive strategy and document it.

---

### Inventory & stock

**P3-14: Stock item – no duplicate name per store**  
**Location:** `backend/routes/stock.py` → `create_item` (StockItem create).  
**Description:** Two stock items in the same store can have the same `name`. This can confuse staff when selecting items for movements or reports.  
**Fix:** Before creating, check that no other item in the same store has the same `name` (case-insensitive if desired). Return 400 if duplicate.

**P3-15: Inventory piece – serial duplicate check present**  
**Verified:** `backend/routes/inventory.py` → `create_piece` checks `existing = db.query(InventoryPiece).filter(InventoryPiece.serial == data.serial).first()` and returns 400 if serial exists. No gap.

---

### Girvi / Metal / Orders

**P3-16: Girvi – no business rule against multiple active loans per customer**  
**Location:** `backend/routes/girvi.py` → `create_loan`.  
**Description:** The same customer can have many active Girvi loans. There is no server-side rule like “only one active loan per customer” or “same jewelry description not allowed again until previous closed.” If the business expects one active loan per customer (or per item), the API does not enforce it.  
**Fix:** If the product owner wants a limit, add a check (e.g. count active loans for this customer or for this customer + description) and return 400 when the limit is exceeded.

**P3-17: Metal exchange / Orders – no duplicate or idempotency rules**  
**Description:** Metal exchange and order create do not enforce idempotency or “duplicate” detection. Multiple identical submissions create multiple records. Acceptable if the business allows it; otherwise consider idempotency or duplicate detection (e.g. same customer + type + amount + date).

---

### Analytics & date handling

**P3-18: Analytics date params – invalid format silently ignored**  
**Location:** `backend/routes/analytics.py` – e.g. `get_summary`, `get_daily`, `get_monthly` use `from_date` / `to_date` with `datetime.strptime(..., "%Y-%m-%d")`.  
**Description:** On `ValueError` (invalid date string), the code uses `pass` and does not filter by that date. The client gets a successful response but with no date filter applied, which can be confusing.  
**Fix:** On `ValueError`, either return 400 with a message like "Invalid date format; use YYYY-MM-DD" or document that invalid dates are ignored.

---

### Data validation & schema

**P3-19: Customer / store / user schemas – no max length on string fields**  
**Location:** `backend/schemas/customer.py` (CustomerCreate: name, primary_phone, address, etc.); `backend/schemas/store_schema.py` (StoreCreate name, address, etc.).  
**Description:** String fields have no `max_length` in Pydantic. The DB has limits (e.g. `String(255)`), so overly long values cause DB errors instead of a clear 400 validation error.  
**Fix:** Add `Field(..., max_length=255)` (or the column size) to string fields that map to limited DB columns so that invalid length is caught at API layer with a clear message.

**P3-20: TransactionCreate – paidAmount and dueAmount not validated against grandTotal**  
**Location:** `backend/schemas/transaction_schema.py` – TransactionCreate.  
**Description:** `paidAmount` and `dueAmount` are accepted without ensuring `paidAmount + dueAmount == grandTotal`. TransactionUpdate has a validator for paid vs grand total; TransactionCreate does not.  
**Fix:** Add a validator (e.g. `@validator('dueAmount')` or root validator) so that `paidAmount + dueAmount == grandTotal` (with a small tolerance for float if needed).

---

### Housekeeping & hardening

**P3-21: Expired password-reset tokens never purged**  
**Location:** `backend/models/password_reset_token.py`; no scheduled job or cleanup.  
**Description:** Used and expired reset tokens remain in the table. Over time the table can grow.  
**Fix:** Add a periodic task or one-off script to delete rows where `expires_at < now()` (and optionally delete used tokens after a retention period).

**P3-22: Login – no rate limiting**  
**Location:** `backend/routes/auth.py` → `login`.  
**Description:** Login can be called repeatedly with no throttling. This allows brute-force attempts on passwords (especially if combined with weak passwords; see P2-5).  
**Fix:** Add rate limiting (e.g. by IP or by email) for login and forgot-password endpoints (e.g. max N attempts per minute). Prefer a middleware or a dedicated library.

---

## Review by functionality

| Area | Duplicate / uniqueness | Validation / consistency | Edge cases / other |
|------|------------------------|---------------------------|--------------------|
| **Auth** | Duplicate email enforced (P3-3 ✓). Admin create user: no check that customer already has account (P3-1). | Password strength (P2-5). | Last admin deletable (P3-2). Reset token in response (P2-1). JWT fallback (P2-2). No login rate limit (P3-22). Reset tokens never purged (P3-21). |
| **Customers** | No duplicate primary_phone per store on add/update/import (P3-4, P3-5, P3-6). Email not unique per store (P3-7). | String max lengths not enforced in schema (P3-19). | — |
| **Customer invites** | Multiple active invites per customer allowed (P3-8). | — | — |
| **Transactions & billing** | — | grandTotal vs product totals not validated; paidAmount + dueAmount vs grandTotal not validated (P3-9, P3-20). transaction_id type str vs int (P3-11). | Record payment not idempotent (P3-10). Transaction create: customerId not checked for store (P1-1). |
| **Payments** | — | — | Double submit can double-record payment (P3-10). |
| **Stores (admin)** | No duplicate store name or contact_phone (P3-12). | — | Delete store without checking related data (P3-13). |
| **Girvi** | No rule against multiple active loans per customer (P3-16). | — | Customer–store check present ✓. |
| **Metal exchange** | No idempotency / duplicate detection (P3-17). | — | Current rates unauthenticated (P2-3). |
| **Orders & repairs** | No idempotency / duplicate detection (P3-17). | — | — |
| **Stock** | No duplicate stock item name per store (P3-14). | — | — |
| **Inventory** | Serial duplicate check present (P3-15 ✓). | — | List not scoped by JWT store (P2-4). |
| **Workers** | Email uniqueness enforced ✓. | — | — |
| **Admin** | Create user for customer: no “customer already has account” check (P3-1). Delete user: no last-admin check (P3-2). | — | — |
| **Customer portal** | — | — | Staff routes visible without login (P1-2); same route guard applies. |
| **Analytics** | — | Invalid date format silently ignored (P3-18). | — |
| **Reminders** | — | — | Duplicate phones (P3-4/5) can cause wrong or duplicate reminders. |

---

## Security (must fix)

### SEC-1: Forgot-password exposes reset token in API response

Same as **P2-1**. Classified as security because the token is a secret that should only be delivered over a separate channel (e.g. email). Returning it in the same API response increases the risk of token leakage (logs, browser tools, proxies). **Must fix:** do not return `reset_token` or `reset_link` in the response; send the link only via email (or another secure channel).

---

### SEC-2: Default JWT secret in production

Same as **P2-2**. If the app runs in production without `SECRET_KEY` set, the default secret makes JWT forgery trivial. **Must fix:** require a proper `SECRET_KEY` in production (no weak fallback).

---

### SEC-3: Unauthenticated metal rates endpoint

Same as **P2-3**. Business-sensitive data (metal rates) is readable without authentication. **Must fix:** protect `GET /api/metal-rates/current` with the same auth as other staff endpoints.

---

## Summary

| ID       | Severity | Title                                              | Must fix |
|----------|----------|----------------------------------------------------|----------|
| P1-1     | P1       | Transaction create: no customer–store validation   | Yes      |
| P1-2     | P1       | Staff routes render without auth (no route guard)   | Yes      |
| P2-1     | P2       | Forgot-password returns token in response (SEC-1)  | Yes      |
| P2-2     | P2       | JWT secret fallback (SEC-2)                         | Yes      |
| P2-3     | P2       | Metal rates /current unauthenticated (SEC-3)       | Yes      |
| P2-4     | P2       | Inventory list not scoped by JWT store             | Yes      |
| P2-5     | P2       | No minimum password strength                       | Yes      |
| P2-6     | P2       | No global 401 handling on frontend                 | Yes      |
| P3-1 … P3-22 | P3   | Duplicate users/customers/invites; validations; idempotency; rate limit; etc. | Nice-to-fix |

**P3 count:** 22 items (duplicate checks, validations, type consistency, analytics dates, schema max lengths, housekeeping). See **Review by functionality** for mapping to Auth, Customers, Transactions, Payments, Girvi, Metal, Orders, Stock, Inventory, Admin, Analytics, Reminders.

**Excluded per request:** UI and styling-only issues (e.g. alignment, colors, font sizes) are not included in this report.
