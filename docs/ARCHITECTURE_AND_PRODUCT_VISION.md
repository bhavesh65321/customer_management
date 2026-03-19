# Architecture & Product Vision – Jewelry Management Software

**Roles:** Senior System Design Engineer + Product Manager  
**Goals:** Simple UI, simple functionality, maximum efficiency; stand out as the top jewelry management software in 1–2 years; serve every customer (small, medium, big).

---

## 1. Current architecture

### 1.1 High-level system context

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                     USERS                                 │
                    │  Staff (store) │ Admin (multi-store) │ Customer (portal)  │
                    └───────────────────────────┬─────────────────────────────┘
                                                │
                    ┌───────────────────────────▼─────────────────────────────┐
                    │              FRONTEND (React SPA)                         │
                    │  • Create React App • React Router • Tailwind • Recharts   │
                    │  • API_BASE = http://127.0.0.1:8000 • JWT in localStorage  │
                    └───────────────────────────┬─────────────────────────────┘
                                                │ REST (JSON)
                    ┌───────────────────────────▼─────────────────────────────┐
                    │              BACKEND (FastAPI)                            │
                    │  • Routes: auth, customer, transactions, stores, admin,    │
                    │    analytics, workers, payments, reminders, girvi,         │
                    │    metal-exchange, orders, stock, inventory, metal-rates,  │
                    │    customer_portal                                         │
                    │  • Auth: JWT (Bearer), roles: admin | staff | customer    │
                    │  • Multi-tenant: store_id in JWT + apply_store_filter()    │
                    └───────────────────────────┬─────────────────────────────┘
                                                │
                    ┌───────────────────────────▼─────────────────────────────┐
                    │              MySQL (single DB)                             │
                    │  • All tenants in one DB; store_id on tenant-scoped rows   │
                    │  • Base.metadata.create_all (no migrations yet)           │
                    └───────────────────────────────────────────────────────────┘
                    ┌───────────────────────────────────────────────────────────┐
                    │  EXTERNAL: SMTP (email), Twilio (SMS) – optional           │
                    └───────────────────────────────────────────────────────────┘
```

### 1.2 Tech stack summary

| Layer      | Technology              | Notes |
|-----------|--------------------------|-------|
| Frontend  | React 19, React Router 7 | CRA, no env-based API URL |
| UI        | Tailwind, Headless UI, Heroicons | i18n (EN/HI), LanguageContext |
| Backend   | FastAPI, Uvicorn        | Sync DB sessions |
| Database  | MySQL, SQLAlchemy ORM   | Single instance, connection pool |
| Auth      | JWT (python-jose), bcrypt | Store/customer/admin in payload |
| Notifications | Twilio, SMTP        | Purchase order / reminders |

### 1.3 Data model (core entities)

| Entity / area      | Purpose |
|--------------------|---------|
| **Store**          | Tenant; has contact_phone, name, address; used for store resolution. |
| **User**           | Login; role (admin/staff/customer); store_id (staff); customer_id (customer). |
| **Customer**       | Per-store; primary_phone, name, email; invites for portal. |
| **Transaction**    | Bill/sale; store_id, customer_id; grandTotal, paidAmount, dueAmount; lines. |
| **TransactionLine**| Product lines; link to inventory piece optional. |
| **Payment**        | Payment against transaction; amount, date. |
| **Invoice**        | Generated invoice (e.g. PDF). |
| **GirviLoan**      | Loan against jewelry; principal, interest rate; photos, interest payments. |
| **MetalExchange**  | Raw→pure, raw→cash, advance (metal/money). |
| **Order**          | Order/repair; status workflow; can link to advance. |
| **StockItem**      | Item master per store; StockMovement for in/out. |
| **InventoryPiece** | Serialized pieces (e.g. serial no). |
| **MetalRate**      | Metal rates (gold/silver etc.). |
| **Reminders**      | SMS/email reminders (e.g. Girvi interest, orders). |

### 1.4 API surface (grouped)

| Prefix                  | Purpose |
|-------------------------|---------|
| `/api/auth`             | Login, register, forgot/reset password, refresh. |
| `/api/customer`         | CRUD, import Excel, invites (create/accept). |
| `/api/transactions`     | Create/update transaction, record payment. |
| `/api/stores`           | Store resolution, “me” for current store. |
| `/api/admin`            | Stores CRUD, users CRUD (create/delete). |
| `/api/analytics`        | Summary, daily, monthly (date-filtered). |
| `/api/workers`          | Staff list, add worker. |
| `/api/payments`         | Payment history, outstanding. |
| `/api/reminders`        | Reminders list, send. |
| `/api/girvi`            | Loans CRUD, interest due, record interest. |
| `/api/metal-exchange`   | Exchange list/create, advance balance. |
| `/api/orders`           | Orders CRUD. |
| `/api/stock`            | Items CRUD, movements, low stock. |
| `/api/inventory`        | Pieces CRUD (serial); list currently not JWT-scoped (P2-4). |
| `/api/metal-rates`       | Current rates (unauthenticated – P2-3), CRUD for admin. |
| Customer portal routes  | Customer-facing: dashboard, profile, invoices, orders. |

### 1.5 Frontend structure

- **Routes:** Unprotected staff routes (P1-2); customer portal under `/customer/*`; admin at `/admin`.
- **Layout:** `ShopLayout` with sidebar from `SHOP_MENU_SECTIONS` (one card per section on Home).
- **API:** Single `api.js` with `apiGet`/`apiPost`/`apiPut`, `authHeaders()`, `getToken`/`parseJwt`; no global 401 handler (P2-6).
- **State:** Local component state; no global store (Redux/Zustand).
- **i18n:** EN/Hindi with `LanguageContext` and `localStorage` persistence.

### 1.6 Configuration and deployment gaps

- **Database:** `DATABASE_URL` is hardcoded in `config/database.py`; not env-driven in code (only SECRET_KEY and SMTP/Twilio use env).
- **API base:** Frontend `API_BASE` is hardcoded `http://127.0.0.1:8000`; no `REACT_APP_API_URL` for environments.
- **CORS:** Fixed origins (localhost/127.0.0.1); production origin not configured.
- **No health check** beyond `GET /`; no readiness/liveness for containers.
- **No migrations:** Schema changes via `create_all` only; no versioned migrations (Alembic).

---

## 2. Target architecture and efficiency opportunities

### 2.1 Principles

- **Simple UI:** Few clicks to complete a task; consistent patterns; section-based navigation (already started with Home cards).
- **Simple functionality:** One clear path per use case; avoid optional branches that confuse small shops.
- **Efficiency:** Fast response times, less data over the wire, scalable for large stores without rewriting.

### 2.2 Backend efficiency

| Opportunity | Current | Target | Impact |
|-------------|---------|--------|--------|
| **Config** | DB URL and CORS hardcoded | `DATABASE_URL`, `CORS_ORIGINS`, `SECRET_KEY` from env; fail fast if SECRET_KEY missing in prod | Security, multi-env, scalability |
| **Migrations** | `create_all` only | Alembic (or similar) for versioned migrations | Safe schema evolution, rollback |
| **Read scaling** | Single MySQL, sync sessions | Keep single DB for now; add connection pooling tuning; later: read replicas for analytics/reports | Medium/large stores |
| **Caching** | None | Optional response cache for metal rates, store “me”, and analytics summary (short TTL) | Fewer DB hits, faster dashboard |
| **Query efficiency** | Ad hoc filters | Consistent use of `apply_store_filter`; indexes on (store_id, created_at) for lists; avoid N+1 (eager load where needed) | Faster list/dashboard for big stores |
| **Idempotency** | None on payments | Idempotency key for record-payment (and other critical writes) | Prevents double charges (P3-10) |
| **Validation** | Partial | Server-side: customer belongs to store (P1-1); grandTotal vs line totals (P3-9); duplicate phone/email per store (P3-4–P3-7) | Data integrity, trust |

### 2.3 Frontend efficiency

| Opportunity | Current | Target | Impact |
|-------------|---------|--------|--------|
| **API base URL** | Hardcoded | `process.env.REACT_APP_API_URL` with fallback for dev | Deploy to staging/production |
| **Route protection** | Staff routes open | Protected route wrapper; redirect to login on 401; no staff UI without token | Security, UX (P1-2, P2-6) |
| **Bundle size** | Single bundle | Code-split by route (React.lazy + Suspense) for Girvi, Metal, Orders, Stock, Admin, Charts | Faster first load for small shops |
| **List performance** | Fetch all then display | Pagination or virtual list for large lists (customers, transactions, orders) | Big stores with 10k+ rows |
| **Offline / PWA** | None | Optional: service worker for static assets; later offline queue for create-bill in poor networks | Reliability in low-connectivity shops |

### 2.4 Infrastructure and operations

| Opportunity | Current | Target | Impact |
|-------------|---------|--------|--------|
| **Environments** | Single | Dev, staging, production with env-specific config | Safe releases, testing |
| **Health** | GET / only | `GET /health` (and optional /ready with DB ping) | Load balancer, Kubernetes |
| **Logging** | Default | Structured logs (JSON); request_id; no secrets in logs | Debugging, auditing |
| **Secrets** | In code / .env | Env in prod; later secret manager (e.g. AWS Secrets Manager) | Security |
| **Deployment** | Manual | CI/CD: test → build → deploy; backend and frontend build artifacts | Consistency, speed to market |

### 2.5 Target architecture (12–24 months)

- **App:** Same stack (React + FastAPI); add protected routes, env-based config, optional caching and read replicas for analytics.
- **Data:** MySQL as primary; optional Redis for session/cache if needed; file store (e.g. S3-compatible) for Girvi photos and uploads.
- **Tenancy:** Keep single DB + store_id; ensure every list/mutation is store-scoped (fix inventory list P2-4 and transaction create P1-1).
- **APIs:** REST retained; add a few “dashboard summary” and “today’s due” endpoints to reduce round-trips and keep UI simple.
- **Mobile:** Optional React Native or PWA later for field staff or customer app; reuse API.

---

## 3. Product vision and differentiation

### 3.1 Vision statement

**“The one jewelry management system that every jeweller—from a single-shop owner to a multi-store chain—can use daily: simple to learn, fast to use, and powerful where it matters.”**

### 3.2 How we stand out (vs typical competitors)

| Dimension | Many competitors | Our direction |
|-----------|--------------------|----------------|
| **Setup** | Heavy onboarding, many screens | Minimal setup: store → add user → add customer → first bill in minutes |
| **Girvi / loans** | Separate product or spreadsheet | Built-in: jewelry details, photos, monthly interest, due list (no Excel) |
| **Metal & advance** | Manual registers | Raw→pure, raw→cash, advance metal/money in one place; advance balance for orders |
| **Orders & repairs** | Paper or separate app | Same app: status flow, link to advance, optional reminders |
| **Stock** | Complex inventory only | Simple items + quantity; stock in/out and low-stock alerts; optional link to bills |
| **Language** | English only | English + Hindi from day one; add more later |
| **Customer portal** | Rare or extra cost | Included: invoices, orders, profile so customers stay engaged |
| **Multi-store** | Enterprise only | Admin can manage multiple stores; staff see only their store |
| **Pricing** | Per-seat or feature-gated | Tiered by store size/usage so small shops can start cheap and grow |

### 3.3 Product principles

1. **Simple UI:** One primary action per screen; section-based home; consistent “list → detail → action” pattern.
2. **Simple functionality:** Default path that works for 80% of cases; advanced options (e.g. bulk import, reports) one level away.
3. **Efficiency:** Few clicks to bill, record payment, or check Girvi due; fast load and response.
4. **Trust:** Correct totals (validation), no cross-store data leak, secure auth and secrets.
5. **Inclusive:** Works for small (single user), medium (few staff, one or two stores), and large (many staff, many stores).

---

## 4. Roadmap to “top in 1–2 years”

### 4.1 Foundation (0–6 months) – Stability and clarity

- **Security & correctness:** Fix P1 (transaction store validation, staff route protection), P2 (token exposure, JWT secret, metal rates auth, inventory scope, 401 handling, password strength). Address critical P3 (duplicate customer/phone, transaction totals validation, idempotency for payments).
- **Config and env:** DATABASE_URL and CORS from env; REACT_APP_API_URL; no default SECRET_KEY in prod.
- **Migrations:** Introduce Alembic; baseline current schema; all future changes via migrations.
- **Protected routes:** Frontend route guard; global 401 → logout and redirect to login.
- **Documentation:** One-page “architecture overview” and “deployment checklist” for your team.

**Outcome:** Safe, deployable product that small and medium jewellers can use daily without data or access issues.

### 4.2 Growth (6–12 months) – Efficiency and scale

- **Performance:** Pagination or virtual scroll on large lists; optional caching for rates and dashboard summary; DB indexes and query review.
- **Efficiency features:** Dashboard widgets (today’s due, low stock, pending orders); “quick bill” from customer screen; bulk actions where needed (e.g. mark multiple orders ready).
- **Reliability:** Health/ready endpoints; structured logging; optional idempotency on more write APIs.
- **Tiering:** Define “Starter / Professional / Enterprise” (or Small / Medium / Big) with clear limits (e.g. users, stores, API usage) and feature visibility; implement feature flags or plan checks so one codebase serves all.

**Outcome:** Same simple UI, but faster and capable of handling medium and large stores; clear path to upgrade.

### 4.3 Leadership (12–24 months) – Differentiated and sticky

- **Differentiation:** Industry-specific reports (e.g. Girvi book, metal movement, order fulfilment); export to GST-friendly format; optional WhatsApp/SMS templates for reminders and receipts.
- **Customer success:** In-app tips, optional onboarding flow, and “what’s new” so every segment (small/medium/big) sees value.
- **Platform:** Optional public API (read-only or key actions) for integrators; optional mobile app (PWA or native) for staff or customers.
- **Data and insights:** Pre-built reports and simple analytics that competitors often charge extra for (e.g. sales by category, Girvi outstanding, metal position).

**Outcome:** Recognized as the most practical and “complete” jewelry management solution for the target market; strong retention across segments.

---

## 5. Tier strategy: small, medium, big

### 5.1 One product, three experiences

- **Single codebase:** One app; behavior and limits vary by plan or store “size” (e.g. stored as plan_id or store tier).
- **Small (e.g. 1 store, 1–3 users):** Full core (customers, billing, payments, Girvi, metal, orders, stock); simple dashboard; no or minimal “advanced” menu (e.g. hide bulk import or some reports). Focus: minimal learning, fast billing and Girvi.
- **Medium (e.g. 1–3 stores, 4–15 users):** Everything in Small + multi-store visibility for owner; workers and roles; reminders and more reports; Excel import. Focus: efficiency and control without complexity.
- **Big (e.g. many stores, many users):** Everything in Medium + analytics and exports; optional API; priority support; stricter SLAs. Focus: scale, compliance, and integration.

### 5.2 Implementation approach

- **Store (or tenant) metadata:** e.g. `plan` or `tier`: `starter | professional | enterprise` (or `small | medium | big`).
- **Feature visibility:** Frontend hides or shows menu items and pages based on tier (and role); backend can enforce limits (e.g. max users, max stores) and return clear errors.
- **Pricing:** Align plans with tiers so small shops pay less and big ones get more capacity and features; avoid “one price for all” so small shops are not priced out.

### 5.3 Keeping UI simple across tiers

- **Progressive disclosure:** Default view is the “simple” path; advanced options (bulk edit, custom reports, API keys) live in Settings or a secondary section.
- **Consistent patterns:** Same “Create bill”, “Record payment”, “New Girvi” flows for all tiers; only the surrounding tools (reports, multi-store, integrations) expand.
- **Performance:** Small stores get instant response; medium and big get pagination and caching so the same UI stays responsive.

---

## 6. Summary: opportunities and priorities

### 6.1 Architecture

- **Documented:** Current system (React SPA + FastAPI + MySQL), multi-tenant by store_id, JWT auth.
- **Gaps:** Env-based config (DB, CORS, API URL), migrations, health checks, route protection, and global 401 handling.
- **Efficiency:** Env + migrations + validation first; then caching and read scaling where needed; optional PWA/offline later.

### 6.2 Product

- **Goal:** Simple UI, simple functionality, high efficiency; top jewelry management software in 1–2 years; every customer (small, medium, big) can use it.
- **Differentiation:** Built-in Girvi, metal exchange, advance, orders/repairs, stock, bilingual, customer portal, multi-store in one product.
- **Roadmap:** 0–6 mo foundation (security, config, migrations, route guard); 6–12 mo efficiency and tiering; 12–24 mo differentiation, platform, and data/insights.
- **Tiers:** One product with Starter/Professional/Enterprise (or Small/Medium/Big); feature and limit matrix so small shops are not overwhelmed and big ones get scale and control.

### 6.3 Next concrete steps

1. Fix P1 and P2 from the bug report; add critical P3 (duplicate checks, transaction validation, payment idempotency).
2. Move `DATABASE_URL` and CORS to env; add `REACT_APP_API_URL`; require `SECRET_KEY` in production.
3. Add protected route wrapper and global 401 handling on the frontend.
4. Introduce Alembic and create initial migration from current schema.
5. Add `GET /health` (and optional `GET /ready`) and document deployment expectations.
6. Define tier/plan enum and feature matrix; implement one “Starter” vs “Professional” distinction (e.g. hide one menu section or cap users) as a proof of concept.

This document can live alongside `BUG_REPORT_LEAD_TEST_ENGINEER.md` and `NEW_FEATURES_PLAN.md` and can be updated as architecture and product decisions evolve.
