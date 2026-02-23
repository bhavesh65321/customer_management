from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from dependencies import require_staff
from models.rates_config import MetalRate
from schemas.rates_schema import MetalRateCreate, MetalRateResponse

router = APIRouter(tags=["Metal Rates"])


@router.get("", response_model=List[MetalRateResponse])
def list_rates(
    db: Session = Depends(get_db),
    _auth=Depends(require_staff),
):
    return db.query(MetalRate).order_by(MetalRate.effective_from.desc()).all()


@router.get("/current")
def get_current_rates(db: Session = Depends(get_db)):
    all_rates = (
        db.query(MetalRate).order_by(MetalRate.effective_from.desc()).all()
    )
    seen = set()
    result = []
    for r in all_rates:
        if r.metal_type not in seen:
            seen.add(r.metal_type)
            result.append(
                {"metal_type": r.metal_type, "rate_per_unit": r.rate_per_unit, "unit": r.unit}
            )
    return result


@router.post("", response_model=MetalRateResponse)
def create_rate(
    data: MetalRateCreate,
    db: Session = Depends(get_db),
    _auth=Depends(require_staff),
):
    rate = MetalRate(
        metal_type=data.metal_type,
        rate_per_unit=data.rate_per_unit,
        unit=data.unit,
    )
    db.add(rate)
    db.commit()
    db.refresh(rate)
    return rate
