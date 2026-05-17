from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from config.database import get_db
from dependencies import require_staff, require_manager
from models.rates_config import MetalRate
from schemas.rates_schema import MetalRateCreate, MetalRateResponse

router = APIRouter(tags=["Metal Rates"])

_RATES_CACHE = "public, max-age=300, stale-while-revalidate=60"


@router.get("", response_model=List[MetalRateResponse])
def list_rates(
    response: Response,
    db: Session = Depends(get_db),
    _auth=Depends(require_staff),
):
    response.headers["Cache-Control"] = _RATES_CACHE
    return db.query(MetalRate).order_by(MetalRate.effective_from.desc()).all()


@router.get("/current")
def get_current_rates(
    response: Response,
    db: Session = Depends(get_db),
    _auth=Depends(require_staff),
):
    response.headers["Cache-Control"] = _RATES_CACHE
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
    _auth=Depends(require_manager),      # ⚠️ only manager+ can SET rates
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


@router.post("/fetch-live")
def fetch_live_metal_rates(
    db: Session = Depends(get_db),
    _auth=Depends(require_manager),      # manager+ can trigger manual refresh
):
    """
    FEAT-02: Manually trigger a live gold/silver rate fetch from external APIs.
    Saves results to the DB immediately (same logic as the hourly scheduler job).
    Returns the fetched rates or an error if all providers failed.
    """
    from services.metal_rate_fetcher import fetch_live_rates, save_rates_to_db
    rates = fetch_live_rates()
    if not rates:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "rate_fetch_failed",
                "message": (
                    "Could not fetch live rates from any provider. "
                    "Check METALPRICEAPI_KEY / GOLDAPI_KEY env vars or network connectivity."
                ),
            },
        )
    count = save_rates_to_db(db, rates)
    return {
        "message": f"Fetched and saved {count} metal rate record(s)",
        "source": rates.get("source"),
        "rates": {
            "gold_24k_per_gram": rates.get("gold_24k"),
            "gold_22k_per_gram": rates.get("gold_22k"),
            "silver_per_gram": rates.get("silver"),
        },
    }
