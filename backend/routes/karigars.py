from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config.database import get_db
from core.db_filters import apply_store_filter, resolve_write_store_id
from dependencies import require_staff
from models.karigar import Karigar
from schemas.karigar_schema import KarigarCreate, KarigarUpdate, KarigarResponse
from utils.activity import log_activity

router = APIRouter(tags=["Karigars"])


def _karigar_dict(k: Karigar) -> dict:
    active_pieces = [p for p in (k.pieces or []) if p.status == "with_karigar"]
    return {
        "id": k.id,
        "store_id": k.store_id,
        "name": k.name,
        "phone": k.phone,
        "notes": k.notes,
        "rate_per_gram": k.rate_per_gram,
        "is_active": k.is_active,
        "created_at": k.created_at,
        "updated_at": k.updated_at,
        "pieces_count": len(active_pieces),
        "total_weight_held": round(sum(p.net_weight or 0 for p in active_pieces), 2),
        "pieces": [
            {
                "id": p.id,
                "name": p.name or p.serial,
                "serial": p.serial,
                "net_weight": p.net_weight,
                "given_on": str(p.given_to_karigar_on) if p.given_to_karigar_on else None,
            }
            for p in active_pieces
        ],
    }


@router.get("")
def list_karigars(
    active_only: bool = True,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(Karigar)
    q = apply_store_filter(q, Karigar, payload)
    if active_only:
        q = q.filter(Karigar.is_active == True)  # noqa: E712
    karigars = q.order_by(Karigar.name.asc()).all()
    return [_karigar_dict(k) for k in karigars]


@router.post("", status_code=201)
def create_karigar(
    data: KarigarCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    store_id = resolve_write_store_id(payload, db)
    row = Karigar(
        store_id=store_id,
        name=data.name.strip(),
        phone=data.phone,
        notes=data.notes,
        rate_per_gram=data.rate_per_gram,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    log_activity(
        db, payload, action="created", entity_type="karigar",
        entity_id=str(row.id), message=f"Added karigar: {row.name}", store_id=store_id,
    )
    return _karigar_dict(row)


@router.patch("/{karigar_id}")
def update_karigar(
    karigar_id: int,
    data: KarigarUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(Karigar).filter(Karigar.id == karigar_id)
    q = apply_store_filter(q, Karigar, payload)
    row = q.first()
    if not row:
        raise HTTPException(status_code=404, detail="Karigar not found")
    if data.name is not None:
        row.name = data.name.strip()
    if data.phone is not None:
        row.phone = data.phone
    if data.notes is not None:
        row.notes = data.notes
    if data.rate_per_gram is not None:
        row.rate_per_gram = data.rate_per_gram
    if data.is_active is not None:
        row.is_active = data.is_active
    db.commit()
    db.refresh(row)
    log_activity(
        db, payload, action="updated", entity_type="karigar",
        entity_id=str(karigar_id), message=f"Updated karigar: {row.name}", store_id=row.store_id,
    )
    return _karigar_dict(row)


