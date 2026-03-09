"""
Shared database query filters for multi-tenant (store) scoping.
"""
from sqlalchemy.orm import Query


def apply_store_filter(query: Query, model, payload: dict) -> Query:
    """
    Restrict query to the current store from JWT payload.
    Use for models that have a store_id column (e.g. Transaction, Customer).
    """
    store_id = payload.get("store_id")
    store_id_col = getattr(model, "store_id", None)
    if store_id_col is None:
        return query
    if store_id is not None:
        return query.filter(store_id_col == store_id)
    return query.filter(store_id_col.is_(None))
