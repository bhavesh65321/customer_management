from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from config.database import get_db
from dependencies import require_staff
from models.inventory_piece import InventoryPiece
from schemas.inventory_schema import (
    InventoryPieceCreate,
    InventoryPieceResponse,
    InventoryPieceUpdate,
)

router = APIRouter(tags=["Inventory"])


@router.get("", response_model=List[InventoryPieceResponse])
def list_pieces(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    q = db.query(InventoryPiece)
    store_id = payload.get("store_id")
    if store_id is not None:
        q = q.filter(InventoryPiece.store_id == store_id)
    return q.all()


@router.post("", response_model=InventoryPieceResponse)
def create_piece(
    data: InventoryPieceCreate,
    db: Session = Depends(get_db),
    _auth=Depends(require_staff),
):
    existing = db.query(InventoryPiece).filter(InventoryPiece.serial == data.serial).first()
    if existing:
        raise HTTPException(status_code=400, detail="Serial already exists")
    piece = InventoryPiece(
        serial=data.serial,
        huid=data.huid,
        metal_type=data.metal_type,
        gross_weight=data.gross_weight,
        net_weight=data.net_weight,
        purity=data.purity,
        store_id=data.store_id,
        certificate_ref=data.certificate_ref,
    )
    db.add(piece)
    db.commit()
    db.refresh(piece)
    return piece


@router.get("/{piece_id}", response_model=InventoryPieceResponse)
def get_piece(
    piece_id: int,
    db: Session = Depends(get_db),
    _auth=Depends(require_staff),
):
    piece = db.query(InventoryPiece).filter(InventoryPiece.id == piece_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    return piece


@router.put("/{piece_id}", response_model=InventoryPieceResponse)
def update_piece(
    piece_id: int,
    data: InventoryPieceUpdate,
    db: Session = Depends(get_db),
    _auth=Depends(require_staff),
):
    piece = db.query(InventoryPiece).filter(InventoryPiece.id == piece_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    if data.huid is not None:
        piece.huid = data.huid
    if data.metal_type is not None:
        piece.metal_type = data.metal_type
    if data.gross_weight is not None:
        piece.gross_weight = data.gross_weight
    if data.net_weight is not None:
        piece.net_weight = data.net_weight
    if data.purity is not None:
        piece.purity = data.purity
    if data.store_id is not None:
        piece.store_id = data.store_id
    if data.certificate_ref is not None:
        piece.certificate_ref = data.certificate_ref
    db.commit()
    db.refresh(piece)
    return piece


@router.delete("/{piece_id}")
def delete_piece(
    piece_id: int,
    db: Session = Depends(get_db),
    _auth=Depends(require_staff),
):
    piece = db.query(InventoryPiece).filter(InventoryPiece.id == piece_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    db.delete(piece)
    db.commit()
    return {"message": "Piece deleted"}
