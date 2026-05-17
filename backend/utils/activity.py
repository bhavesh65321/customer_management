from typing import Optional

from sqlalchemy.orm import Session

from models.audit_log import AuditLog
from models.user_model import User
from utils.logger import log_audit_json


def resolve_actor(db: Session, payload: dict) -> tuple[Optional[int], str]:
    uid = payload.get("user_id")
    if uid is not None:
        u = db.query(User).filter(User.id == uid).first()
        if u:
            label = (u.name or "").strip() or (u.email or "").strip() or f"User #{uid}"
            return uid, label
    email = payload.get("sub")
    if email:
        return uid, str(email)
    return uid, "Staff"


def log_activity(
    db: Session,
    payload: dict,
    *,
    action: str,
    entity_type: str,
    message: str,
    entity_id: Optional[str] = None,
    store_id: Optional[int] = None,
    old_value=None,
    new_value=None,
) -> None:
    uid, actor_name = resolve_actor(db, payload)
    sid = store_id if store_id is not None else payload.get("store_id")
    role = payload.get("role")

    # 1. Persist to DB audit_log table
    row = AuditLog(
        user_id=uid,
        store_id=sid,
        actor_name=actor_name[:200] if actor_name else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        message=message,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(row)
    db.commit()

    # 2. Also write JSON line to logs/audit.log
    log_audit_json(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        message=message,
        user_id=uid,
        actor_name=actor_name,
        role=role,
        store_id=sid,
        old_value=old_value,
        new_value=new_value,
    )
