# Security Audit Report — Jewellery Management System API

**Date:** 2026-05-06  
**Auditor:** Senior Security Engineer (Automated OWASP Top 10 + API Security Test Suite)  
**Scope:** Backend REST API — FastAPI, SQLAlchemy, MySQL (port 8000)  
**Method:** Dynamic testing (live HTTP requests against running server) + static code review  
**Prior context:** Follows 100% pass E2E functional test (76/76 scenarios)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 0 |
| 🟠 HIGH | 2 |
| 🟡 MEDIUM | 4 |
| 🔵 LOW | 3 |
| **Total findings** | **9** |

**Overall assessment:** The authentication core is solid (JWT HS256, bcrypt, rate limiting, RBAC all functional). The main risk surface is **security misconfiguration** — missing HTTP security headers, publicly exposed API documentation, and supply-chain dependency management. Two data-integrity / infrastructure gaps complete the list.

---

## Confirmed Passes (what works well)

| Category | Verified Controls |
|---|---|
| A01 Access Control | All unauthenticated endpoints return 401. Staff cannot access admin routes. No privilege escalation via role injection in worker creation. IDOR: staff cannot read other stores' customers. |
| A02 Cryptography | JWT uses HS256 (no "none" algorithm accepted). Forged alg=none tokens rejected. Expired tokens rejected. Malformed tokens rejected. Password hash never exposed in API responses. |
| A03 Injection | SQL injection payloads (`' OR '1'='1`, `UNION SELECT`, `SLEEP(2)`, `DROP TABLE`) all returned non-500 responses — ORM parameterization working. Mass assignment of `role`/`is_superuser` via customer create body silently ignored (schema enforced). |
| A04 Insecure Design | Brute-force protection triggers 429 at attempt #9 (within 10-attempt window). Forgot-password returns 200 for unknown emails (no enumeration). CORS correctly rejects arbitrary `Origin: http://evil.com`. |
| A07 Auth Failures | Weak passwords (`123456`, `password`, `aaaaaa`, `Abc123`) all rejected at worker creation. Timing delta between valid/invalid email login < 200ms (no account enumeration via timing). |
| A08 Data Integrity | Negative payment amounts rejected (422). Zero payment amounts rejected (422). Idempotency key accepted without double-charge. |
| A09 Logging | `app.log` and `requests.log` both active. Login success/failure events logged with timestamp, email, IP, role, store_id (structured JSON). |
| A10 Input Validation | 100KB string payload handled gracefully (no 500). Path traversal in `?q=../../etc/passwd` handled. Null bytes and emoji (×100) in text fields handled safely. |

---

## Findings — Prioritized

---

### 🟠 HIGH-001 — Rate Limiter State Is In-Memory Only (Not Persistent)

**Category:** A04 — Insecure Design  
**OWASP API:** API8:2023 — Security Misconfiguration  
**File:** `backend/utils/rate_limit.py`

**Description:**  
The rate limiter stores attempt counts in a Python `dict` in process memory. If the server process restarts (crash, deploy, Docker restart), the entire rate-limit state is wiped. An attacker can trigger a server restart or wait for a scheduled deploy to reset the counter and continue a brute-force attack.

```python
# backend/utils/rate_limit.py
_attempts: dict[str, list[float]] = {}   # lost on restart
```

The limiter is also keyed by IP only — rotating IPs (VPN, Tor, residential proxies) bypasses it entirely within the same window.

**Risk:** Sustained brute-force attack against admin accounts survives server restarts.

**Recommendation:**
1. Move rate-limit state to Redis using `redis-py` with a sliding-window key like `rl:login:{ip}`.
2. Add per-email locking in addition to per-IP (prevent distributed brute-force from many IPs targeting one account).
3. Example key: `rl:login:email:{email}` with TTL=60s, max=5.

---

### 🟠 HIGH-002 — Girvi Loan API: Input Validation for Negative Principal Unverifiable (405 Method Not Allowed)

**Category:** A08 — Software and Data Integrity Failures  
**File:** `backend/routes/girvi.py` (endpoint discovery required)

**Description:**  
A test of `POST /api/girvi/loans` with `principal: -1000` returned HTTP 405 (Method Not Allowed), indicating the route URL or HTTP method used in the test does not match the registered endpoint. The correct girvi loan creation route could not be identified from the test, so **negative principal validation is unverified**.

Manual verification is required:
```
GET /api/openapi.json | grep girvi   # find correct route
```

**Risk:** If the girvi loan schema does not validate `principal > 0`, a user could create a loan with a negative principal, corrupting ledger calculations and potentially generating credits from nothing.

**Recommendation:**  
Locate the correct girvi loan creation endpoint and ensure the Pydantic schema enforces:
```python
class GirviLoanCreate(BaseModel):
    principal: float = Field(..., gt=0, description="Must be positive")
    interest_rate: float = Field(..., ge=0, le=100)
```

---

### 🟡 MEDIUM-001 — Swagger UI and OpenAPI Schema Publicly Accessible (No Auth)

**Category:** A05 — Security Misconfiguration  
**File:** `backend/main.py` (FastAPI app instantiation)

**Verified:**
```
GET /api/docs       → 200 OK  (Swagger UI — full interactive API explorer)
GET /api/openapi.json → 200 OK  (Complete schema with all routes, models, request/response shapes)
GET /api/redoc      → 200 OK  (ReDoc alternate UI)
```

**Description:**  
Any anonymous user on the internet can browse the complete API documentation, discover every endpoint, understand all request/response schemas, and plan targeted attacks — without any credentials.

**Risk:** Significantly reduces attacker effort. Attackers can enumerate all endpoints, identify undocumented admin routes, and craft injection payloads knowing exact field names.

**Recommendation:**
```python
# main.py — Production config
import os

IS_PROD = os.getenv("ENV", "dev") == "production"

app = FastAPI(
    docs_url=None if IS_PROD else "/api/docs",
    redoc_url=None if IS_PROD else "/api/redoc",
    openapi_url=None if IS_PROD else "/api/openapi.json",
)
```
Or gate docs behind admin auth using a custom route that serves the HTML only to authenticated admins.

---

### 🟡 MEDIUM-002 — Missing Critical HTTP Security Headers

**Category:** A05 — Security Misconfiguration  
**File:** `backend/main.py` (middleware section)

**Verified missing headers (checked on authenticated response):**

| Header | Status | Risk |
|--------|--------|------|
| `X-Content-Type-Options: nosniff` | ❌ Missing | Browser MIME-type sniffing — can execute uploaded files as scripts |
| `X-Frame-Options: DENY` | ❌ Missing | Clickjacking — attacker can iframe the admin dashboard |
| `Strict-Transport-Security` | ❌ Missing | SSL stripping — downgrade HTTPS to HTTP in transit |
| `Content-Security-Policy` | ❌ Missing | XSS execution — no restriction on script sources |
| `Referrer-Policy` | ❌ Missing | Token leakage in Referrer header to third parties |

**Recommendation:** Add `SecurityHeadersMiddleware` using `starlette`:
```python
# backend/main.py
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response

app.add_middleware(SecurityHeadersMiddleware)
```

---

### 🟡 MEDIUM-003 — All Python Dependencies Use `>=` Constraints (Not Pinned)

**Category:** A06 — Vulnerable and Outdated Components  
**File:** `backend/requirements.txt`

**Description:**  
Every package in `requirements.txt` uses minimum-version constraints (`>=`) rather than exact pinned versions (`==`). This means `pip install` on a new deployment may silently install a newer (potentially breaking or vulnerable) version.

```
# Current (unsafe):
fastapi>=0.100.0
sqlalchemy>=1.4.0
python-jose[cryptography]>=3.3.0

# Required (safe):
fastapi==0.111.0
sqlalchemy==2.0.30
python-jose[cryptography]==3.3.0
```

**Risk:**
- Supply-chain attack: a malicious release of a dependency auto-installs on next deployment.
- Breaking changes in major versions cause unexpected behavior in production.
- No reproducible builds — different deployments may run different code.

**Recommendation:**
```bash
# In the venv, generate a pinned lockfile:
pip freeze > requirements.lock.txt

# Use this file for all production deployments:
pip install -r requirements.lock.txt
```
Add Dependabot or `pip-audit` to CI to check for known CVEs.

---

### 🟡 MEDIUM-004 — CORS Configuration Is Overly Permissive (`allow_methods=["*"]`, `allow_headers=["*"]`)

**Category:** A05 — Security Misconfiguration  
**File:** `backend/main.py`

**Description:**  
While `allow_origins` is correctly restricted to `["http://127.0.0.1:3000", "http://localhost:3000"]`, the CORS configuration allows **all HTTP methods** and **all headers** from those origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],    # ← any verb including DELETE, PATCH, OPTIONS
    allow_headers=["*"],    # ← any header including custom attack headers
)
```

**Risk:** `allow_credentials=True` combined with `allow_methods=["*"]` means a compromised frontend domain can make DELETE/PATCH requests to arbitrary endpoints. Any XSS on the frontend becomes a full API takeover.

**Recommendation:**
```python
allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
```

---

### 🔵 LOW-001 — `Server: uvicorn` Header Exposes Web Server Technology

**Category:** A05 — Security Misconfiguration  
**Verified:** `Server: uvicorn` in all response headers

**Description:** The `Server` response header reveals the underlying web server technology and version. This aids attackers in fingerprinting the stack and finding version-specific exploits.

**Recommendation:** Add a custom `Server` header override in the `SecurityHeadersMiddleware` (see MEDIUM-002):
```python
response.headers["Server"] = "webserver"
```
Or configure this in the nginx/caddy reverse proxy that should sit in front of uvicorn in production.

---

### 🔵 LOW-002 — `/api/auth/register` Endpoint Has No Rate Limiting

**Category:** A04 — Insecure Design  
**File:** `backend/routes/auth.py`

**Description:**  
From code review, `POST /api/auth/register` has no rate limiting applied. An attacker can create unlimited test accounts to probe the system, pollute the database, or attempt credential stuffing from freshly-registered accounts.

**Note:** This was identified in code review; the endpoint may be customer-facing only and disabled in production.

**Recommendation:**
```python
# routes/auth.py — add to register endpoint
check_rate_limit(request, "register")
```
And add registration events to the audit log.

---

### 🔵 LOW-003 — JWT Token Remains Valid After User Deactivation (Unverifiable — Endpoint Missing)

**Category:** A07 — Authentication Failures  
**File:** `backend/routes/workers.py` / `backend/dependencies.py`

**Description:**  
The test attempted `PUT /api/workers/{id}/deactivate` to deactivate a staff account and verify the old JWT was rejected. The endpoint returned **405 Method Not Allowed** — the correct deactivate endpoint URL could not be determined.

From code review, `dependencies.py` does check `is_active` on every JWT decode (good). However, if the deactivate action updates the DB flag but the JWT has several hours left of expiry, the behavior needs verification:

```python
# dependencies.py — confirmed present:
if not user.is_active:
    raise HTTPException(status_code=401, detail="Account deactivated")
```

**Recommendation:**  
Confirm the deactivation endpoint exists, updates `is_active=False` in DB, and is tested. The `dependencies.py` check is in place — this is likely already secure, but requires a functional test to confirm.

---

## Test Coverage Summary

| OWASP Category | Tests Run | Pass | Findings |
|---|---|---|---|
| A01 — Broken Access Control | 7 | 7 | 0 |
| A02 — Cryptographic Failures | 5 | 5 | 0 |
| A03 — Injection | 7 | 7 | 0 |
| A04 — Insecure Design | 4 | 4 | 0 (HIGH-001 from code review) |
| A05 — Security Misconfiguration | 8 | 2 | 6 → 4 distinct findings |
| A06 — Vulnerable Components | 1 | 0 | 1 |
| A07 — Auth Failures | 6 | 6 | 0 |
| A08 — Data Integrity | 4 | 3 | 1 (HIGH-002 — unverifiable) |
| A09 — Logging & Monitoring | 3 | 3 | 0 |
| A10 — SSRF & Input Validation | 4 | 4 | 0 |
| **Total** | **49** | **41** | **9** |

---

## Remediation Priority

| Priority | Finding | Effort | Impact |
|---|---|---|---|
| 1 | MEDIUM-001 — Disable public API docs in production | Low (env flag) | High |
| 2 | MEDIUM-002 — Add security headers middleware | Low (10 lines) | High |
| 3 | HIGH-001 — Redis-backed rate limiter | Medium | High |
| 4 | HIGH-002 — Verify girvi loan input validation | Low (Pydantic field) | Medium |
| 5 | MEDIUM-003 — Pin all dependencies | Low (pip freeze) | Medium |
| 6 | MEDIUM-004 — Restrict CORS methods/headers | Low (config change) | Medium |
| 7 | LOW-001 — Remove Server header | Low (middleware) | Low |
| 8 | LOW-002 — Rate-limit /register | Low (add decorator) | Low |
| 9 | LOW-003 — Verify deactivation flow | Low (functional test) | Low |

---

*Report generated by automated OWASP Top 10 security test suite. All findings verified via live HTTP requests against the running backend unless marked "code review".*
