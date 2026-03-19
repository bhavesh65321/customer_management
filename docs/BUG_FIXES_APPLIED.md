# Bug Fixes Applied (P1, P2, P3, Security)

Summary of code changes applied to address the issues in `BUG_REPORT_LEAD_TEST_ENGINEER.md`.  
**Note:** There is no P4 in the original report; all P1, P2, P3, and Security items below have been addressed in code.

---

## P1 (Critical)

### P1-1: Transaction create – customer must belong to staff’s store
- **Files:** `backend/routes/transactional_route.py`
- **Change:** In `save_transaction`, before calling `create_transaction`, the customer is loaded by `transaction.customerId`. If the staff user has a `store_id`, the customer’s `store_id` must match; otherwise 403 is returned. Admins (no `store_id`) are not restricted by this check in the same way; staff are fully scoped.

### P1-2: Staff routes protected – no UI without login
- **Files:** `frontend/src/App.js`, `frontend/src/components/ProtectedRoute.jsx`
- **Change:** Added `ProtectedRoute` that checks for a valid JWT (present and not expired) and staff role (admin/staff). All staff routes are nested under a single parent route whose element is `<ProtectedRoute><Outlet /></ProtectedRoute>`. Unauthenticated or invalid token redirects to `/login`; customer role redirects to `/customer/dashboard`.

---

## P2 (High) & Security

### P2-1 / SEC-1: Forgot-password – do not return reset token in response
- **Files:** `backend/controllers/auth_controller.py`
- **Change:** `forgot_password` now returns only `{"message": "If an account exists with this email, a reset link has been sent."}`. The reset link must be sent via email (or another channel) by the caller; it is no longer in the API response.

### P2-2 / SEC-2: JWT secret – no weak fallback in production
- **Files:** `backend/utils/auth_utils.py`
- **Change:** `SECRET_KEY` is read from env. If `ENV` is `production` or `prod` and `SECRET_KEY` is unset, the app raises at startup. In non-production, a dev-only fallback is used.

### P2-3 / SEC-3: Metal rates “current” – require authentication
- **Files:** `backend/routes/metal_rates.py`
- **Change:** `get_current_rates` now uses `Depends(require_staff)` so only authenticated staff can access it.

### P2-4: Inventory list – scope by JWT store
- **Files:** `backend/routes/inventory.py`
- **Change:** `list_pieces` no longer takes an optional `store_id` query param. It uses the JWT payload’s `store_id` from `require_staff`. Staff see only their store’s inventory; admins (no `store_id`) see all.

### P2-5: Minimum password strength
- **Files:** `backend/controllers/auth_controller.py`, `backend/schemas/user_schema.py`, `backend/routes/admin.py`, `backend/routes/workers.py`
- **Change:** Added `_validate_password_strength` (min 8 chars, at least one letter and one number). Used in registration, customer invite registration, reset password, admin create user, and add worker. Schema password fields (register, reset, admin create, worker create) use `min_length=8`.

### P2-6: Global 401 handling on frontend
- **Files:** `frontend/src/api.js`
- **Change:** Shared `handleResponse` checks for `res.status === 401`. On 401, token is removed from `localStorage` and the user is redirected to `/customer/login` or `/login` based on current path. All `apiGet`/`apiPost`/`apiPut` use this. `API_BASE` can be overridden via `REACT_APP_API_URL`.

---

## P3 (Medium / Low)

### P3-1: Admin create user (customer) – customer exists and no existing account
- **Files:** `backend/routes/admin.py`
- **Change:** When `role=customer`, the code verifies the customer exists and that no `User` already has this `customer_id`; otherwise 400 with a clear message.

### P3-2: Admin delete user – do not delete last admin
- **Files:** `backend/routes/admin.py`
- **Change:** Before deleting a user with `role=admin`, the code checks that at least one other admin exists; otherwise 400.

### P3-4, P3-5, P3-6, P3-7: Customer duplicate phone and email per store
- **Files:** `backend/routes/customer.py`
- **Change:** Added `_normalize_phone`. On add and update customer, duplicate `primary_phone` (normalized) within the same store returns 400. Same for email when provided. Import: each row checks for existing phone/email in the store; duplicates are reported in `errors` and the row is skipped (no duplicate rows created).

### P3-8: Invite – one active invite per customer
- **Files:** `backend/routes/customer.py`
- **Change:** Before creating a new invite, all existing unused (not used, not expired) invites for that customer are deleted, so only one active invite link exists at a time.

### P3-9, P3-20: Transaction totals validation
- **Files:** `backend/controllers/transaction_controller.py`, `backend/schemas/transaction_schema.py`
- **Change:** In `create_transaction`, server-side check that `grandTotal` equals the sum of product totals and that `paidAmount + dueAmount == grandTotal` (with 0.01 tolerance). `TransactionCreate` has a `@model_validator(mode="after")` that enforces `paidAmount + dueAmount == grandTotal`.

### P3-10: Record payment – idempotency
- **Files:** `backend/routes/transactional_route.py`, `backend/models/idempotency.py`, `backend/models/__init__.py`
- **Change:** New model `PaymentIdempotency` stores `idempotency_key`, `transaction_id`, `amount`, `response_snapshot`. When the client sends `Idempotency-Key` header, a matching existing record (same key, transaction_id, amount) returns the stored response; otherwise the payment is recorded and the response is stored.

### P3-11: update_transaction – transaction_id type
- **Files:** `backend/controllers/transaction_controller.py`
- **Change:** `update_transaction` parameter `transaction_id` type changed from `str` to `int`.

### P3-12: Store create – duplicate name/contact_phone
- **Files:** `backend/routes/admin.py`
- **Change:** Before creating a store, the code checks for an existing store with the same name (case-insensitive) or the same contact_phone; 400 if duplicate.

### P3-13: Delete store – check related data
- **Files:** `backend/routes/admin.py`
- **Change:** Before deleting a store, the code checks for existing transactions, customers, and users for that store; 400 with a clear message if any exist.

### P3-14: Stock item – duplicate name per store
- **Files:** `backend/routes/stock.py`
- **Change:** Before creating a stock item, the code checks for an existing item in the same store with the same name (case-insensitive); 400 if duplicate.

### P3-18: Analytics – invalid date format returns 400
- **Files:** `backend/routes/analytics.py`
- **Change:** Where `from_date`/`to_date` or `date` are parsed with `strptime`, `ValueError` now raises `HTTPException(400, "Invalid ... date; use YYYY-MM-DD")` instead of being ignored.

### P3-19: Schema max length on strings
- **Files:** `backend/schemas/customer.py`, `backend/schemas/store_schema.py`
- **Change:** `CustomerCreate` and `StoreCreate` string fields use `Field(..., max_length=...)` aligned with DB column sizes where applicable.

### P3-21: Expired reset tokens – purge on forgot_password
- **Files:** `backend/controllers/auth_controller.py`
- **Change:** When handling forgot-password, expired reset tokens (`expires_at < now`) are deleted in the same request (housekeeping).

### P3-22: Login / forgot-password – rate limiting
- **Files:** `backend/utils/rate_limit.py`, `backend/routes/auth.py`
- **Change:** In-memory rate limiter (per IP): max 10 attempts per 60 seconds for login and for forgot-password. Returns 429 when exceeded.

---

## Not implemented (by design or deferred)

- **P3-16 (Girvi multiple active loans):** No limit added; business rule left to product owner.
- **P3-17 (Metal/Orders idempotency):** Not implemented; acceptable for current use.
- **P4:** Not present in the original bug report.

---

## Database

- New table `payment_idempotency` is created via `Base.metadata.create_all` when the app starts (model: `PaymentIdempotency` in `models/idempotency.py`). For existing deployments, ensure migrations or a one-off create of this table if you do not use `create_all`.

---

## Frontend build note

- `npm run build` may fail due to an existing ESLint error in `ShopPage.jsx` (e.g. `initialProduct` not defined). That is unrelated to the bug fixes above. Fixing that will allow the production build to succeed.
