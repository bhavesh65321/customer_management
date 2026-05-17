from math import ceil
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from config.database import get_db
from core.db_filters import apply_store_filter
from dependencies import require_staff
from models.inventory_piece import InventoryPiece
from models.piece_lifecycle import PieceLifecycleEvent
from schemas.inventory_schema import (
    InventoryPieceCreate,
    InventoryPieceResponse,
    InventoryPieceUpdate,
)
from schemas.piece_event_schema import PieceLifecycleEventCreate, PieceLifecycleEventResponse
from utils.activity import log_activity

router = APIRouter(tags=["Inventory"])

ALLOWED_EVENT_TYPES = {
    "inventory_in",
    "sent_to_karigar",
    "returned_from_karigar",
    "qc_passed",
    "listed",
    "sold",
    "adjusted",
    "note",
}


def _piece_query_for_staff(db: Session, piece_id: int, payload: dict):
    q = db.query(InventoryPiece).filter(InventoryPiece.id == piece_id)
    return apply_store_filter(q, InventoryPiece, payload)


def _piece_dict(p: InventoryPiece) -> dict:
    return {
        "id": p.id,
        "serial": p.serial,
        "name": p.name,
        "category": p.category,
        "huid": p.huid,
        "metal_type": p.metal_type,
        "gross_weight": p.gross_weight,
        "net_weight": p.net_weight,
        "purity": p.purity,
        "store_id": p.store_id,
        "certificate_ref": p.certificate_ref,
        "stone_weight_carat": p.stone_weight_carat,
        "stone_type": p.stone_type,
        "stone_details": p.stone_details,
        "making_charge_per_g": p.making_charge_per_g,
        "wastage_pct": p.wastage_pct,
        "location_bin": p.location_bin,
        "design_sku": p.design_sku,
        "photo_url": p.photo_url,
        "status": p.status,
        "notes": p.notes,
        "karigar_id": p.karigar_id,
        "karigar_name": p.karigar.name if p.karigar else None,
        "given_to_karigar_on": str(p.given_to_karigar_on) if p.given_to_karigar_on else None,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    }


@router.get("")
def list_pieces(
    search: Optional[str] = None,
    status: Optional[str] = None,
    metal_type: Optional[str] = None,
    page: int = Query(0, ge=0, description="1-based page. 0 = all (legacy)"),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(InventoryPiece)
    q = apply_store_filter(q, InventoryPiece, payload)
    if search:
        term = f"%{search}%"
        q = q.filter(
            InventoryPiece.name.ilike(term) |
            InventoryPiece.serial.ilike(term) |
            InventoryPiece.huid.ilike(term) |
            InventoryPiece.category.ilike(term)
        )
    if status:
        q = q.filter(InventoryPiece.status == status)
    if metal_type:
        q = q.filter(InventoryPiece.metal_type == metal_type)

    q = q.order_by(InventoryPiece.created_at.desc())
    total = q.count()

    if page > 0:
        pieces = q.offset((page - 1) * page_size).limit(page_size).all()
    else:
        pieces = q.all()

    total_gold_g = round(sum(p.net_weight or 0 for p in pieces if p.metal_type == "gold"), 2)
    total_silver_g = round(sum(p.net_weight or 0 for p in pieces if p.metal_type == "silver"), 2)
    with_karigar = sum(1 for p in pieces if p.status == "with_karigar")
    available = sum(1 for p in pieces if p.status in ("in_stock", "available"))

    result = {
        "pieces": [_piece_dict(p) for p in pieces],
        "summary": {
            "total": total,
            "available": available,
            "with_karigar": with_karigar,
            "total_gold_g": total_gold_g,
            "total_silver_g": total_silver_g,
        },
    }

    if page > 0:
        headers = {
            "X-Total-Count": str(total),
            "X-Page": str(page),
            "X-Page-Size": str(page_size),
            "X-Total-Pages": str(ceil(total / page_size) if total else 0),
            "Access-Control-Expose-Headers": "X-Total-Count, X-Page, X-Page-Size, X-Total-Pages",
        }
        return JSONResponse(content=result, headers=headers)

    return result


@router.post("")
def create_piece(
    data: InventoryPieceCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    existing = db.query(InventoryPiece).filter(InventoryPiece.serial == data.serial).first()
    if existing:
        raise HTTPException(status_code=400, detail="Serial already exists")
    store_id = data.store_id
    jwt_store = payload.get("store_id")
    if jwt_store is not None:
        store_id = jwt_store
    if store_id is None:
        raise HTTPException(status_code=403, detail="Store required to create a piece")
    piece = InventoryPiece(
        serial=data.serial,
        name=data.name if hasattr(data, "name") else None,
        category=data.category if hasattr(data, "category") else None,
        huid=data.huid,
        metal_type=data.metal_type,
        gross_weight=data.gross_weight,
        net_weight=data.net_weight,
        purity=data.purity,
        store_id=store_id,
        certificate_ref=data.certificate_ref,
        stone_weight_carat=data.stone_weight_carat,
        stone_type=data.stone_type,
        stone_details=getattr(data, "stone_details", None),
        making_charge_per_g=getattr(data, "making_charge_per_g", None),
        wastage_pct=data.wastage_pct,
        location_bin=data.location_bin,
        design_sku=data.design_sku,
        photo_url=getattr(data, "photo_url", None),
        status=data.status or "in_stock",
        notes=data.notes,
        karigar_id=getattr(data, "karigar_id", None),
        given_to_karigar_on=getattr(data, "given_to_karigar_on", None),
    )
    db.add(piece)
    db.flush()
    uid = payload.get("user_id")
    evt = PieceLifecycleEvent(
        store_id=store_id,
        piece_id=piece.id,
        event_type="inventory_in",
        notes="Piece added to inventory",
        created_by_user_id=uid,
    )
    db.add(evt)
    db.commit()
    db.refresh(piece)
    log_activity(
        db, payload, action="created", entity_type="inventory_piece",
        entity_id=str(piece.id),
        message=f"Added jewellery piece: {piece.name or piece.serial}",
        store_id=store_id,
    )
    return _piece_dict(piece)


@router.patch("/{piece_id}")
def patch_piece(
    piece_id: int,
    data: InventoryPieceUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    piece = _piece_query_for_staff(db, piece_id, payload).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    patch = data.dict(exclude_unset=True)
    for k, v in patch.items():
        if k == "store_id" and payload.get("store_id") is not None:
            continue
        if hasattr(piece, k):
            setattr(piece, k, v)
    db.commit()
    db.refresh(piece)
    log_activity(
        db, payload, action="updated", entity_type="inventory_piece",
        entity_id=str(piece_id),
        message=f"Updated piece: {piece.name or piece.serial}",
        store_id=piece.store_id,
    )
    return _piece_dict(piece)


@router.get("/{piece_id}/events", response_model=List[PieceLifecycleEventResponse])
def list_piece_events(
    piece_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    if not _piece_query_for_staff(db, piece_id, payload).first():
        raise HTTPException(status_code=404, detail="Piece not found")
    q = (
        db.query(PieceLifecycleEvent)
        .filter(PieceLifecycleEvent.piece_id == piece_id)
        .order_by(PieceLifecycleEvent.created_at.desc())
    )
    q = apply_store_filter(q, PieceLifecycleEvent, payload)
    return q.all()


@router.post("/{piece_id}/events", response_model=PieceLifecycleEventResponse)
def add_piece_event(
    piece_id: int,
    data: PieceLifecycleEventCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    piece = _piece_query_for_staff(db, piece_id, payload).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    if data.event_type not in ALLOWED_EVENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"event_type must be one of {sorted(ALLOWED_EVENT_TYPES)}",
        )
    store_id = piece.store_id
    if store_id is None:
        raise HTTPException(status_code=400, detail="Piece has no store")
    uid = payload.get("user_id")
    evt = PieceLifecycleEvent(
        store_id=store_id, piece_id=piece_id, event_type=data.event_type,
        notes=data.notes, payload=data.payload, karigar_id=data.karigar_id,
        order_id=data.order_id, created_by_user_id=uid,
    )
    db.add(evt)
    db.commit()
    db.refresh(evt)
    log_activity(
        db, payload, action="timeline_note", entity_type="piece_event",
        entity_id=str(piece_id),
        message=f"Piece #{piece_id}: {data.event_type.replace('_', ' ')}"
        + (f" — {data.notes}" if data.notes else ""),
        store_id=store_id,
    )
    return evt


@router.get("/{piece_id}")
def get_piece(
    piece_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    piece = _piece_query_for_staff(db, piece_id, payload).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    return _piece_dict(piece)


@router.put("/{piece_id}")
def update_piece(
    piece_id: int,
    data: InventoryPieceUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    piece = _piece_query_for_staff(db, piece_id, payload).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    patch = data.dict(exclude_unset=True)
    for k, v in patch.items():
        if k == "store_id" and payload.get("store_id") is not None:
            continue
        if hasattr(piece, k):
            setattr(piece, k, v)
    db.commit()
    db.refresh(piece)
    log_activity(
        db, payload, action="updated", entity_type="inventory_piece",
        entity_id=str(piece_id),
        message=f"Updated jewellery piece: {piece.name or piece.serial} (#{piece_id})",
        store_id=piece.store_id,
    )
    return _piece_dict(piece)


@router.delete("/{piece_id}")
def delete_piece(
    piece_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    piece = _piece_query_for_staff(db, piece_id, payload).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    label = piece.name or piece.serial
    sid = piece.store_id
    db.delete(piece)
    db.commit()
    log_activity(
        db, payload, action="deleted", entity_type="inventory_piece",
        entity_id=str(piece_id),
        message=f"Deleted jewellery piece: {label} (#{piece_id})",
        store_id=sid,
    )
    return {"message": "Piece deleted"}


ALLOWED_EVENT_TYPES = {
    "inventory_in",
    "sent_to_karigar",
    "returned_from_karigar",
    "qc_passed",
    "listed",
    "sold",
    "adjusted",
    "note",
}


def _piece_query_for_staff(db: Session, piece_id: int, payload: dict):
    q = db.query(InventoryPiece).filter(InventoryPiece.id == piece_id)
    return apply_store_filter(q, InventoryPiece, payload)


@router.get("", response_model=List[InventoryPieceResponse])
def list_pieces(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(InventoryPiece)
    q = apply_store_filter(q, InventoryPiece, payload)
    return q.order_by(InventoryPiece.created_at.desc()).all()


@router.post("", response_model=InventoryPieceResponse)
def create_piece(
    data: InventoryPieceCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    existing = db.query(InventoryPiece).filter(InventoryPiece.serial == data.serial).first()
    if existing:
        raise HTTPException(status_code=400, detail="Serial already exists")
    store_id = data.store_id
    jwt_store = payload.get("store_id")
    if jwt_store is not None:
        store_id = jwt_store
    if store_id is None:
        raise HTTPException(status_code=403, detail="Store required to create a piece")
    status = data.status or "in_stock"
    piece = InventoryPiece(
        serial=data.serial,
        huid=data.huid,
        metal_type=data.metal_type,
        gross_weight=data.gross_weight,
        net_weight=data.net_weight,
        purity=data.purity,
        store_id=store_id,
        certificate_ref=data.certificate_ref,
        stone_weight_carat=data.stone_weight_carat,
        stone_type=data.stone_type,
        wastage_pct=data.wastage_pct,
        location_bin=data.location_bin,
        design_sku=data.design_sku,
        status=status,
        notes=data.notes,
    )
    db.add(piece)
    db.flush()
    uid = payload.get("user_id")
    evt = PieceLifecycleEvent(
        store_id=store_id,
        piece_id=piece.id,
        event_type="inventory_in",
        notes="Piece added to inventory",
        created_by_user_id=uid,
    )
    db.add(evt)
    db.commit()
    db.refresh(piece)
    log_activity(
        db,
        payload,
        action="created",
        entity_type="inventory_piece",
        entity_id=str(piece.id),
        message=f"Added jewellery piece: serial {piece.serial}",
        store_id=store_id,
    )
    return piece


@router.get("/{piece_id}/events", response_model=List[PieceLifecycleEventResponse])
def list_piece_events(
    piece_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    if not _piece_query_for_staff(db, piece_id, payload).first():
        raise HTTPException(status_code=404, detail="Piece not found")
    q = (
        db.query(PieceLifecycleEvent)
        .filter(PieceLifecycleEvent.piece_id == piece_id)
        .order_by(PieceLifecycleEvent.created_at.desc())
    )
    q = apply_store_filter(q, PieceLifecycleEvent, payload)
    return q.all()


@router.post("/{piece_id}/events", response_model=PieceLifecycleEventResponse)
def add_piece_event(
    piece_id: int,
    data: PieceLifecycleEventCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    piece = _piece_query_for_staff(db, piece_id, payload).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    if data.event_type not in ALLOWED_EVENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"event_type must be one of {sorted(ALLOWED_EVENT_TYPES)}",
        )
    store_id = piece.store_id
    if store_id is None:
        raise HTTPException(status_code=400, detail="Piece has no store")
    uid = payload.get("user_id")
    evt = PieceLifecycleEvent(
        store_id=store_id,
        piece_id=piece_id,
        event_type=data.event_type,
        notes=data.notes,
        payload=data.payload,
        karigar_id=data.karigar_id,
        order_id=data.order_id,
        created_by_user_id=uid,
    )
    db.add(evt)
    db.commit()
    db.refresh(evt)
    log_activity(
        db,
        payload,
        action="timeline_note",
        entity_type="piece_event",
        entity_id=str(piece_id),
        message=f"Piece #{piece_id}: {data.event_type.replace('_', ' ')}"
        + (f" — {data.notes}" if data.notes else ""),
        store_id=store_id,
    )
    return evt


@router.get("/{piece_id}", response_model=InventoryPieceResponse)
def get_piece(
    piece_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    piece = _piece_query_for_staff(db, piece_id, payload).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    return piece


@router.put("/{piece_id}", response_model=InventoryPieceResponse)
def update_piece(
    piece_id: int,
    data: InventoryPieceUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    piece = _piece_query_for_staff(db, piece_id, payload).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    patch = data.dict(exclude_unset=True)
    for k, v in patch.items():
        if k == "store_id" and payload.get("store_id") is not None:
            continue
        setattr(piece, k, v)
    db.commit()
    db.refresh(piece)
    log_activity(
        db,
        payload,
        action="updated",
        entity_type="inventory_piece",
        entity_id=str(piece_id),
        message=f"Updated jewellery piece: serial {piece.serial} (#{piece_id})",
        store_id=piece.store_id,
    )
    return piece


@router.delete("/{piece_id}")
def delete_piece(
    piece_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    piece = _piece_query_for_staff(db, piece_id, payload).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    serial = piece.serial
    sid = piece.store_id
    db.delete(piece)
    db.commit()
    log_activity(
        db,
        payload,
        action="deleted",
        entity_type="inventory_piece",
        entity_id=str(piece_id),
        message=f"Deleted jewellery piece: serial {serial} (#{piece_id})",
        store_id=sid,
    )
    return {"message": "Piece deleted"}
