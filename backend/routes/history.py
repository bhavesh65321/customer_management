from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from config.database import get_db
from dependencies import require_staff
from models.audit_log import AuditLog

router = APIRouter(tags=["Activity history"])

_AREA_LABELS: Dict[str, str] = {
    "customer": "Customer",
    "inventory_piece": "Serialized jewellery",
    "piece_event": "Piece timeline",
    "karigar": "Karigar",
    "order": "Order / repair",
    "transaction": "Bill",
    "reminder": "Reminders",
    "user": "Account",
}


def _area_label(entity_type: str) -> str:
    return _AREA_LABELS.get(entity_type, entity_type.replace("_", " ").title())


def _fallback_text(row: AuditLog) -> str:
    parts = [row.action.replace("_", " ").title(), row.entity_type.replace("_", " ")]
    if row.entity_id:
        parts.append(f"#{row.entity_id}")
    return " — ".join(parts)


def _filter_by_store(q, payload: dict):
    store_id = payload.get("store_id")
    role = payload.get("role")
    if store_id is not None:
        return q.filter(AuditLog.store_id == store_id)
    if role == "admin":
        return q
    return q.filter(AuditLog.store_id.is_(None))


@router.get("")
def list_activity_history(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(AuditLog).order_by(desc(AuditLog.created_at))
    q = _filter_by_store(q, payload)
    total = q.count()
    rows = q.offset(offset).limit(limit).all()
    items: List[Dict[str, Any]] = []
    for r in rows:
        who = r.actor_name or (f"User #{r.user_id}" if r.user_id else "—")
        what = (r.message or "").strip() or _fallback_text(r)
        items.append(
            {
                "id": r.id,
                "at": r.created_at.isoformat() if r.created_at else None,
                "who": who,
                "what": what,
                "area": _area_label(r.entity_type),
                "action": r.action,
            }
        )
    return {"total": total, "offset": offset, "limit": limit, "items": items}
