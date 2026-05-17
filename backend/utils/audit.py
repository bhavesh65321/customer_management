from sqlalchemy.orm import Session
from models.audit_log import AuditLog
from typing import Optional, Any


def log_audit(
    db: Session,
    user_id: Optional[int],
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    old_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    *,
    store_id: Optional[int] = None,
    actor_name: Optional[str] = None,
    message: Optional[str] = None,
):
    entry = AuditLog(
        user_id=user_id,
        store_id=store_id,
        actor_name=actor_name,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        message=message,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(entry)
    db.commit()
