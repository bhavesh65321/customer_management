"""
Shared database query filters for multi-tenant (store) scoping.
"""
from sqlalchemy.orm import Query, Session
from sqlalchemy import false as sql_false
from fastapi import HTTPException


def apply_store_filter(query: Query, model, payload: dict) -> Query:
    """
    Restrict query to the current store from JWT payload.

    Rules:
      • store_id present in JWT  → filter to that store only
      • admin with no store_id   → no filter (sees all stores' data)
      • staff/manager with no store_id → blocked (returns no rows)
        This is a safety-net for misconfigured accounts.
    """
    store_id = payload.get("store_id")
    role = payload.get("role", "staff")
    store_id_col = getattr(model, "store_id", None)

    if store_id_col is None:
        return query

    if store_id is not None:
        # Normal case: scoped to the user's store
        return query.filter(store_id_col == store_id)

    if role == "admin":
        # Admin with no store → platform-level, sees everything
        return query

    # Staff or manager without a store is misconfigured → see nothing
    return query.filter(sql_false())


def resolve_write_store_id(payload: dict, db: Session, body_store_id: int = None) -> int:
    """
    Resolve a store_id for write operations (POST / PUT / DELETE).

    Rules:
      • store_id in JWT → use it (staff/manager scoped to their store)
      • body_store_id provided by caller → use it (admin explicitly picks store)
      • admin with no store_id → fall back to first active store
      • anything else → 403
    """
    store_id = payload.get("store_id")
    if store_id is not None:
        return store_id

    role = payload.get("role", "staff")
    if role == "admin":
        # Admin can pass store_id in body, or we pick the first active store
        if body_store_id:
            return body_store_id
        # Lazy import to avoid circular deps
        from models.store import Store
        first = db.query(Store).filter(Store.is_active == True).order_by(Store.id).first()
        if first:
            return first.id
        raise HTTPException(status_code=400, detail="No active stores found")

    raise HTTPException(status_code=403, detail="Store required — your account is not linked to a store")
