from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import http_exception_handler as _default_http_handler
from starlette.exceptions import HTTPException as StarletteHTTPException
from routes.auth import router as auth_router
from routes.customer import router as customer_router
from config.database import Base, engine
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from routes.transactional_route import router as transaction_routes
from routes.stores import router as stores_router
from routes.metal_rates import router as metal_rates_router
from routes.inventory import router as inventory_router
from routes.customer_portal import router as customer_portal_router
from routes.admin import router as admin_router
from routes.analytics import router as analytics_router
from routes.workers import router as workers_router
from routes.payments import router as payments_router
from routes.reminders import router as reminders_router
from routes.girvi import router as girvi_router
from routes.metal_exchange import router as metal_exchange_router
from routes.orders import router as orders_router
from routes.workflow_templates import router as workflow_templates_router
from routes.stock import router as stock_router
from routes.karigars import router as karigars_router
from routes.insights import router as insights_router
from routes.notifications import router as notifications_router
from routes.history import router as history_router
from routes.ai_business import router as ai_business_router
from routes.gst import router as gst_router
from routes.dashboard import router as dashboard_router
from routes.billing import router as billing_router
from routes.bulk_import import router as bulk_import_router
from routes.reports import router as reports_router
from routes.loyalty import router as loyalty_router

import models  # noqa: F401 - register all model tables before create_all
from db_ensure_schema import ensure_jewellery_intelligence_schema, ensure_audit_log_schema, ensure_user_schema, ensure_store_schema, ensure_gst_schema, ensure_2fa_schema
from middleware.auth_middleware import AuthLoggingMiddleware
from middleware.rate_limit_middleware import limiter
from middleware.security_headers import SecurityHeadersMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from utils.logger import log_app_event
from utils.errors import ErrorCode, make_error_body
from config.settings import ENV, CORS_ORIGINS

# BE-03: APScheduler for recurring background jobs
from apscheduler.schedulers.background import BackgroundScheduler
from services.task_queue import register_scheduled_jobs
from config.database import SessionLocal as _SessionLocal
_scheduler = BackgroundScheduler(timezone="Asia/Kolkata")

# ---------------------------------------------------------------------------
# DB schema — additive column patches for existing deployments
# ---------------------------------------------------------------------------
# NOTE: Base.metadata.create_all() has been REMOVED.
# Schema is now managed exclusively by Alembic migrations.
# To apply schema changes: cd backend && alembic upgrade head
# To create a new migration: alembic revision --autogenerate -m "description"
# ---------------------------------------------------------------------------
def _run_migrations():
    try:
        # Only run the additive ALTER TABLE patches for existing DBs that
        # were created before Alembic was introduced. These are idempotent
        # and safe to keep running until all deployments have been migrated
        # via `alembic upgrade head`.
        ensure_jewellery_intelligence_schema(engine)
        ensure_audit_log_schema(engine)
        ensure_user_schema(engine)
        ensure_store_schema(engine)
        ensure_gst_schema(engine)
        ensure_2fa_schema(engine)
        log_app_event("info", "migrations_complete")
    except Exception as exc:
        log_app_event("error", "migrations_failed", error=str(exc))
        raise

# _run_migrations()

# Auto create all tables for fresh deployments
Base.metadata.create_all(bind=engine)

_BACKEND_DIR = Path(__file__).resolve().parent
_UPLOADS_DIR = _BACKEND_DIR / "uploads"
_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
(_UPLOADS_DIR / "store_logos").mkdir(parents=True, exist_ok=True)
(_UPLOADS_DIR / "girvi_photos").mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Customer Management API",
    version="1.0.0",
    description=(
        "## Jewellery Business Management Platform\n\n"
        "A multi-tenant REST API for managing jewellery store operations including:\n"
        "- 🔐 **Authentication & RBAC** — JWT-based auth with roles: admin, manager, staff, customer\n"
        "- 👥 **Customers** — Full customer lifecycle management\n"
        "- 💰 **Transactions & Billing** — GST-compliant invoices, PDF generation\n"
        "- 📦 **Inventory** — Serialized jewellery piece tracking\n"
        "- 🏆 **Girvi (Pledge Loans)** — Loan tracking with interest calculations\n"
        "- ⚖️ **Metal Exchange** — Old gold/silver exchange records\n"
        "- 🔧 **Orders & Repairs** — Work order management with karigar assignment\n"
        "- 📊 **Analytics & AI** — Business insights and AI-powered review\n\n"
        "### Authentication\n"
        "All protected endpoints require a Bearer JWT token in the `Authorization` header.\n"
        "Obtain tokens via `POST /api/auth/login`.\n\n"
        "### Role Hierarchy\n"
        "`admin` > `manager` > `staff` > `customer`"
    ),
    contact={
        "name": "Support",
        "email": "support@example.com",
    },
    license_info={
        "name": "Proprietary",
    },
    # SEC-04: API docs are only available in non-production environments.
    # Set ENV=production in .env to disable /api/docs, /api/redoc, /api/openapi.json
    docs_url="/api/docs" if ENV != "production" else None,
    redoc_url="/api/redoc" if ENV != "production" else None,
    openapi_url="/api/openapi.json" if ENV != "production" else None,
)
app.mount("/uploads", StaticFiles(directory=str(_UPLOADS_DIR)), name="uploads")

# ── Rate limiter (SEC-03) ────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Startup / Shutdown events ───────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    log_app_event("info", "startup", message="Customer Management API started successfully", version="1.0.0")
    # BE-03: start scheduled background jobs
    try:
        register_scheduled_jobs(_scheduler, _SessionLocal)
        _scheduler.start()
        log_app_event("info", "scheduler_started", jobs=len(_scheduler.get_jobs()))
    except Exception as exc:
        log_app_event("error", "scheduler_start_failed", error=str(exc))
    # MON-01/MON-02: seed default subscription plans (idempotent)
    try:
        from services.billing_service import seed_plans
        _db = _SessionLocal()
        try:
            seed_plans(_db)
            log_app_event("info", "billing_plans_seeded")
        finally:
            _db.close()
    except Exception as exc:
        log_app_event("error", "billing_seed_failed", error=str(exc))

@app.on_event("shutdown")
async def on_shutdown():
    log_app_event("info", "shutdown", message="Customer Management API shutting down")
    try:
        if _scheduler.running:
            _scheduler.shutdown(wait=False)
    except Exception:
        pass


# ── Standardised error handlers ─────────────────────────────────────────────
# Handler 1: FastAPI/Starlette HTTPException  →  standard envelope
@app.exception_handler(StarletteHTTPException)
async def http_error_handler(request: Request, exc: StarletteHTTPException):
    # Preserve error_code if raised via our AppError subclasses
    code = getattr(exc, "error_code", None) or ErrorCode.from_status(exc.status_code)
    details = getattr(exc, "details", None)
    # exc.detail can be str, dict, or list — normalise to str for message
    if isinstance(exc.detail, str):
        message = exc.detail
    elif isinstance(exc.detail, dict):
        message = exc.detail.get("message") or exc.detail.get("detail") or str(exc.detail)
        details = details or {k: v for k, v in exc.detail.items() if k not in ("message", "detail")} or None
    else:
        message = str(exc.detail)

    if exc.status_code >= 500:
        log_app_event("error", "http_error", status=exc.status_code,
                      path=str(request.url.path), code=code, message=message)

    return JSONResponse(
        status_code=exc.status_code,
        content=make_error_body(
            code=code,
            message=message,
            path=str(request.url.path),
            details=details,
        ),
    )


# Handler 2: Pydantic / FastAPI request validation errors  →  standard envelope
@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # Build a list of field-level error summaries
    field_errors = []
    for err in exc.errors():
        loc = " → ".join(str(l) for l in err.get("loc", []) if l != "body")
        field_errors.append({"field": loc or "request", "issue": err.get("msg", "invalid")})

    return JSONResponse(
        status_code=422,
        content=make_error_body(
            code=ErrorCode.UNPROCESSABLE,
            message="Request validation failed — check the 'details' field for per-field errors",
            path=str(request.url.path),
            details=field_errors,
        ),
    )


# Handler 3: Unhandled exceptions  →  generic 500 in standard envelope
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    log_app_event("error", "unhandled_exception",
                  path=str(request.url.path),
                  method=request.method,
                  error=str(exc),
                  exc_type=type(exc).__name__)
    return JSONResponse(
        status_code=500,
        content=make_error_body(
            code=ErrorCode.INTERNAL_ERROR,
            message="An unexpected error occurred. Our team has been notified.",
            path=str(request.url.path),
        ),
    )

# ── Middleware (order matters: last added = outermost) ──────────────────────
# CORS must be outermost so pre-flight OPTIONS requests are handled first.
# SEC-06: origins are loaded from CORS_ORIGINS env var (set in .env).
# Default: localhost:3000 only. Never use allow_origins=["*"] in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Request/auth logging middleware (runs inside CORS)
app.add_middleware(AuthLoggingMiddleware)
# SEC-05: security headers on every response
app.add_middleware(SecurityHeadersMiddleware)

@app.options("/{rest_of_path:path}")
async def preflight_handler(request: Request, rest_of_path: str = ""):
    return JSONResponse(content={"message": "Preflight OK"}, status_code=200)


@app.get("/")
def read_root():
    return {"message": "Server is running"}

# SEC-08: Structured health check endpoint for load balancers and uptime monitors.
# Returns 200 when the DB is reachable, 503 otherwise.
@app.get("/health", tags=["ops"])
def health_check():
    """
    Liveness + readiness probe.
    - Returns 200 {"status": "ok"} when the database is reachable.
    - Returns 503 {"status": "degraded"} if the DB is down.
    Use this as the target for Docker HEALTHCHECK, Kubernetes probes, or Uptime Robot.
    """
    from config.database import engine
    import time
    start = time.time()
    try:
        with engine.connect() as conn:
            conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_ok = True
    except Exception as e:
        db_ok = False
    elapsed_ms = round((time.time() - start) * 1000, 1)
    if db_ok:
        return JSONResponse(
            content={"status": "ok", "db": "connected", "latency_ms": elapsed_ms},
            status_code=200,
        )
    return JSONResponse(
        content={"status": "degraded", "db": "unreachable", "latency_ms": elapsed_ms},
        status_code=503,
    )

# Register routes
app.include_router(auth_router, prefix="/api/auth")
app.include_router(customer_router, prefix="/api/customer")
app.include_router(transaction_routes, prefix="/api/transactions")
app.include_router(stores_router, prefix="/api/stores")
app.include_router(metal_rates_router, prefix="/api/metal-rates")
app.include_router(inventory_router, prefix="/api/inventory")
app.include_router(admin_router, prefix="/api/admin")
app.include_router(analytics_router, prefix="/api/analytics")
app.include_router(workers_router, prefix="/api/workers")
app.include_router(payments_router, prefix="/api/payments")
app.include_router(reminders_router, prefix="/api/reminders")
app.include_router(girvi_router, prefix="/api/girvi")
app.include_router(metal_exchange_router, prefix="/api/metal-exchange")
app.include_router(orders_router, prefix="/api/orders")
app.include_router(workflow_templates_router, prefix="/api/workflow-templates")
app.include_router(stock_router, prefix="/api/stock")
app.include_router(karigars_router, prefix="/api/karigars")
app.include_router(insights_router, prefix="/api/insights")
app.include_router(notifications_router, prefix="/api/notifications")
app.include_router(history_router, prefix="/api/history")
app.include_router(ai_business_router, prefix="/api/ai")
app.include_router(gst_router, prefix="/api/gst")
app.include_router(dashboard_router, prefix="/api/dashboard")
app.include_router(billing_router, prefix="/api/billing")
app.include_router(bulk_import_router, prefix="/api/bulk-import")
app.include_router(reports_router, prefix="/api/reports")
app.include_router(loyalty_router, prefix="/api/loyalty")
app.include_router(customer_portal_router)

