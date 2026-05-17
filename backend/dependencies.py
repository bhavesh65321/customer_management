"""
RBAC dependency hierarchy
=========================

Role hierarchy (highest → lowest privilege):
  superadmin > admin > manager > staff > customer

  superadmin  = Platform / SaaS owner. Sees ALL stores on the platform.
                Access to platform-wide admin panel (/api/platform/*).
  admin       = Store owner / company admin. Sees ONLY their own store.
                Access to their store's admin panel (/api/admin/*).
  manager     = Store manager. Reports + config for their store.
  staff       = Regular store employee.
  customer    = End customer portal user.

Permission matrix:
  ┌──────────────────────────┬───────────┬───────┬─────────┬───────┬──────────┐
  │ Action                   │superadmin │ admin │ manager │ staff │ customer │
  ├──────────────────────────┼───────────┼───────┼─────────┼───────┼──────────┤
  │ Platform: all stores     │     ✓     │       │         │       │          │
  │ Platform: billing/plans  │     ✓     │       │         │       │          │
  │ Own store: manage users  │     ✓     │   ✓   │         │       │          │
  │ Own store: reports       │     ✓     │   ✓   │    ✓    │       │          │
  │ Own store: txns/customers│     ✓     │   ✓   │    ✓    │   ✓   │          │
  │ Customer portal          │           │       │         │       │    ✓     │
  └──────────────────────────┴───────────┴───────┴─────────┴───────┴──────────┘

Dependency functions:
  get_token_payload        → decodes JWT, 401 if missing/invalid
  get_current_user         → alias for get_token_payload
  require_superadmin       → role == "superadmin"  ← platform owner only
  require_admin            → role in ("superadmin", "admin")  ← store admin+
  require_manager          → role in ("superadmin", "admin", "manager")
  require_staff            → role in ("superadmin", "admin", "manager", "staff")
  require_customer         → role == "customer" + customer_id present
  optional_user            → returns payload or None (no error)

  -- MON-03 / MON-04 subscription guards --
  require_active_sub       → raises 402 if trial expired or subscription cancelled
  check_customer_limit     → raises 403 if store has hit plan's max_customers cap
  check_feature            → raises 403 if store's plan doesn't include a feature flag
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from utils.auth_utils import verify_token

security = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# Core token extraction
# ---------------------------------------------------------------------------

def get_token_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Decode and validate the Bearer JWT. Raises 401 if missing or invalid."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Reject deactivated users (is_active flag embedded at login)
    if payload.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact your administrator.",
        )
    return payload


def get_current_user(payload: dict = Depends(get_token_payload)) -> dict:
    """Alias for get_token_payload — any authenticated user."""
    return payload


# ---------------------------------------------------------------------------
# Role-based guards
# ---------------------------------------------------------------------------

def require_superadmin(payload: dict = Depends(get_token_payload)) -> dict:
    """
    Platform owner only. Guards all cross-store / platform-level routes.
    Store admins (role='admin') are explicitly blocked here.
    """
    if payload.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required",
        )
    return payload


def require_admin(payload: dict = Depends(get_token_payload)) -> dict:
    """Store admin or platform owner. Use for store user/config management."""
    if payload.get("role") not in ("superadmin", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return payload


def require_manager(payload: dict = Depends(get_token_payload)) -> dict:
    """Restrict to admin or manager. Use for reports, bulk ops, config."""
    if payload.get("role") not in ("superadmin", "admin", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or admin access required",
        )
    return payload


def require_staff(payload: dict = Depends(get_token_payload)) -> dict:
    """
    Restrict to admin, manager, or staff.
    This is the standard guard for most business routes.
    """
    if payload.get("role") not in ("superadmin", "admin", "manager", "staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required",
        )
    return payload


def require_customer(payload: dict = Depends(get_token_payload)) -> dict:
    """Restrict to customer portal users only."""
    if payload.get("role") != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer access required",
        )
    customer_id = payload.get("customer_id")
    if customer_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer account not linked",
        )
    return payload


# ---------------------------------------------------------------------------
# Optional auth (no error if unauthenticated)
# ---------------------------------------------------------------------------

def optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    """Return decoded payload or None — never raises. Use for public routes that
    optionally personalize when a token is present."""
    if not credentials or not credentials.credentials:
        return None
    return verify_token(credentials.credentials)


# ---------------------------------------------------------------------------
# MON-03 — Subscription enforcement
# ---------------------------------------------------------------------------

def require_active_sub(
    payload: dict = Depends(require_staff),
    db=None,  # injected via Depends in routes that need it
) -> dict:
    """
    Raises HTTP 402 if the store's subscription is not active.
    Admin users bypass this check.

    Usage in a route:
        @router.post("/girvi")
        def create_girvi(..., _sub = Depends(require_active_sub), ...):

    The DB check is done lazily — only when store_id is present (non-admin).
    Admins (no store_id) always pass.
    """
    if payload.get("role") == "admin":
        return payload

    store_id = payload.get("store_id")
    if not store_id:
        return payload  # misconfigured but not our problem here

    # Lazy import to avoid circular deps
    from config.database import SessionLocal
    _db = SessionLocal()
    try:
        from models.store import Store
        store = _db.query(Store).filter(Store.id == store_id).first()
        if store and not store.is_subscription_active:
            status_val = store.subscription_status
            if store.is_trial_expired:
                raise HTTPException(
                    status_code=402,
                    detail={
                        "error": "trial_expired",
                        "message": (
                            "Your 14-day free trial has ended. "
                            "Please subscribe to continue using the service."
                        ),
                        "subscription_status": "trial_expired",
                        "upgrade_url": "/billing/plans",
                    },
                )
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "subscription_required",
                    "message": f"Your subscription is {status_val}. Please renew to continue.",
                    "subscription_status": status_val,
                    "upgrade_url": "/billing/plans",
                },
            )
    finally:
        _db.close()

    return payload


# ---------------------------------------------------------------------------
# MON-04 — Usage limit guards
# ---------------------------------------------------------------------------

def check_customer_limit(payload: dict = Depends(require_staff)) -> dict:
    """
    Raises HTTP 403 if the store has reached its plan's max_customers cap.
    Use on POST /api/customer/add.

    Admin users and stores on unlimited plans (max_customers=None) always pass.
    """
    if payload.get("role") == "admin":
        return payload

    store_id = payload.get("store_id")
    if not store_id:
        return payload

    from config.database import SessionLocal
    _db = SessionLocal()
    try:
        from models.store import Store
        from models.customer import Customer

        store = _db.query(Store).filter(Store.id == store_id).first()
        if not store or not store.plan:
            return payload  # no plan set → no limit

        max_c = store.plan.max_customers
        if max_c is None:
            return payload  # unlimited

        count = _db.query(Customer).filter(
            Customer.store_id == store_id,
            Customer.is_active == True,
        ).count()

        if count >= max_c:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "customer_limit_reached",
                    "message": (
                        f"Your {store.plan.display_name} plan allows up to {max_c} customers. "
                        "Upgrade to add more."
                    ),
                    "current_count": count,
                    "limit": max_c,
                    "upgrade_url": "/billing/plans",
                },
            )
    finally:
        _db.close()

    return payload


def check_feature(feature: str):
    """
    Dependency factory — raises 403 if the store's plan doesn't include `feature`.

    Usage:
        @router.post("/girvi/new")
        def create_girvi(..., _f = Depends(check_feature("has_girvi")), ...):

    Available features: has_girvi, has_analytics, has_metal_exchange,
                        has_inventory, has_whatsapp, has_bulk_import,
                        has_reports_export, has_api_access
    """
    def _check(payload: dict = Depends(require_staff)) -> dict:
        if payload.get("role") == "admin":
            return payload

        store_id = payload.get("store_id")
        if not store_id:
            return payload

        from config.database import SessionLocal
        _db = SessionLocal()
        try:
            from models.store import Store
            store = _db.query(Store).filter(Store.id == store_id).first()
            if not store or not store.plan:
                return payload  # no plan = no restrictions during early onboarding

            if not getattr(store.plan, feature, False):
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "feature_not_available",
                        "message": (
                            f"This feature is not included in your {store.plan.display_name} plan. "
                            "Upgrade to access it."
                        ),
                        "feature": feature,
                        "upgrade_url": "/billing/plans",
                    },
                )
        finally:
            _db.close()

        return payload

    return _check

