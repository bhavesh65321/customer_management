from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from models.inventory_piece import InventoryPiece
from models.piece_lifecycle import PieceLifecycleEvent


def record_piece_sale_events(
    db: Session,
    transaction_id: int,
    store_id: Optional[int],
    products: Any,
    customer_name: str,
    user_id: Optional[int],
) -> None:
    if not products:
        return
    for p in products:
        if not isinstance(p, dict):
            continue
        piece_id = p.get("pieceId")
        if not piece_id:
            continue
        piece = db.query(InventoryPiece).filter(InventoryPiece.id == int(piece_id)).first()
        if not piece:
            continue
        if store_id is not None and piece.store_id is not None and piece.store_id != store_id:
            continue
        sid = piece.store_id if piece.store_id is not None else store_id
        if sid is None:
            continue
        evt = PieceLifecycleEvent(
            store_id=sid,
            piece_id=piece.id,
            event_type="sold",
            notes=f"Bill #{transaction_id}",
            transaction_id=transaction_id,
            created_by_user_id=user_id,
            payload={"customerName": customer_name, "productName": p.get("productName")},
        )
        piece.status = "sold"
        db.add(evt)
    db.commit()
