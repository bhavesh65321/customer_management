"""
services/metal_rate_fetcher.py — FEAT-02: Live Gold/Silver Rate Auto-Fetch

Strategy (no paid API required):
  1. Primary:  metal-price.com free JSON API  (500 req/month free)
  2. Fallback: goldapi.io free tier             (100 req/day free)
  3. Fallback: forex-data-feed / open fallback  (static formula from USD/INR)

Rates returned are per gram in INR for:
  - gold_24k   (24 carat, 999 purity)
  - gold_22k   (22 carat, 916 purity)
  - silver     (999 purity)

All fetch functions return:
  dict | None  — None means fetch failed silently (caller should skip DB write)

The scheduler job (job_refresh_metal_rates) is called every 60 minutes and writes
the latest rate into the MetalRate table (stored as "rate_per_unit" in INR/gram).
"""

import logging
import os
from datetime import datetime, timezone
from typing import Optional

import requests
import time
import pymysql
from sqlalchemy.exc import OperationalError as SAOperationalError

logger = logging.getLogger(__name__)

# ── constants ────────────────────────────────────────────────────────────────
GOLD_PURITY_22K = 0.916
GRAMS_PER_TROY_OZ = 31.1035

# API keys loaded from env — app works without them (graceful degradation)
_METALPRICEAPI_KEY: str = os.environ.get("METALPRICEAPI_KEY", "")
_GOLDAPI_KEY: str = os.environ.get("GOLDAPI_KEY", "")

_TIMEOUT = 8  # seconds


# ---------------------------------------------------------------------------
# Provider 1 — metalpriceapi.com (free: 500 req/month)
# ---------------------------------------------------------------------------
def _fetch_metalpriceapi() -> Optional[dict]:
    """https://metalpriceapi.com/documentation — free plan returns base currency prices."""
    if not _METALPRICEAPI_KEY:
        return None
    try:
        url = "https://api.metalpriceapi.com/v1/latest"
        params = {"api_key": _METALPRICEAPI_KEY, "base": "INR", "currencies": "XAU,XAG"}
        resp = requests.get(url, params=params, timeout=_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        if not data.get("success"):
            logger.warning("metalpriceapi: %s", data.get("error", {}).get("info", "unknown error"))
            return None
        rates = data.get("rates", {})
        # XAU = INR per troy oz of gold; XAG = INR per troy oz of silver
        inr_per_oz_gold = rates.get("XAU")
        inr_per_oz_silver = rates.get("XAG")
        if not inr_per_oz_gold or not inr_per_oz_silver:
            return None
        # Metalpriceapi returns "how many INR per 1 XAU" when base=INR?
        # Actually it gives "how much base currency (INR) per 1 unit of currency"
        # So XAU rate = INR per 1 XAU = INR per 1 troy oz
        gold_24k_per_gram = float(inr_per_oz_gold) / GRAMS_PER_TROY_OZ
        gold_22k_per_gram = gold_24k_per_gram * GOLD_PURITY_22K
        silver_per_gram = float(inr_per_oz_silver) / GRAMS_PER_TROY_OZ
        logger.info("metalpriceapi: gold24k=%.2f silver=%.2f INR/g", gold_24k_per_gram, silver_per_gram)
        return {
            "gold_24k": round(gold_24k_per_gram, 2),
            "gold_22k": round(gold_22k_per_gram, 2),
            "silver": round(silver_per_gram, 2),
            "source": "metalpriceapi.com",
        }
    except Exception as exc:
        logger.warning("metalpriceapi fetch failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Provider 2 — goldapi.io (free: 100 req/day)
# ---------------------------------------------------------------------------
def _fetch_goldapi() -> Optional[dict]:
    """https://www.goldapi.io — free tier, requires API key header."""
    if not _GOLDAPI_KEY:
        return None
    try:
        headers = {"x-access-token": _GOLDAPI_KEY, "Content-Type": "application/json"}
        # Fetch gold price in USD
        resp_gold = requests.get("https://www.goldapi.io/api/XAU/USD", headers=headers, timeout=_TIMEOUT)
        resp_gold.raise_for_status()
        gold_data = resp_gold.json()

        # Fetch silver price in USD
        resp_silver = requests.get("https://www.goldapi.io/api/XAG/USD", headers=headers, timeout=_TIMEOUT)
        resp_silver.raise_for_status()
        silver_data = resp_silver.json()

        # Get USD/INR rate
        usd_inr = _get_usd_inr_rate()
        if not usd_inr:
            return None

        gold_usd_per_oz = gold_data.get("price")
        silver_usd_per_oz = silver_data.get("price")
        if not gold_usd_per_oz or not silver_usd_per_oz:
            return None

        gold_24k_per_gram = (float(gold_usd_per_oz) * usd_inr) / GRAMS_PER_TROY_OZ
        gold_22k_per_gram = gold_24k_per_gram * GOLD_PURITY_22K
        silver_per_gram = (float(silver_usd_per_oz) * usd_inr) / GRAMS_PER_TROY_OZ

        logger.info("goldapi: gold24k=%.2f silver=%.2f INR/g", gold_24k_per_gram, silver_per_gram)
        return {
            "gold_24k": round(gold_24k_per_gram, 2),
            "gold_22k": round(gold_22k_per_gram, 2),
            "silver": round(silver_per_gram, 2),
            "source": "goldapi.io",
        }
    except Exception as exc:
        logger.warning("goldapi fetch failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Helper — USD/INR exchange rate from a free forex source
# ---------------------------------------------------------------------------
def _get_usd_inr_rate() -> Optional[float]:
    """Fetch current USD→INR rate from exchangerate-api.com (free, no key needed for basic)."""
    try:
        resp = requests.get(
            "https://open.er-api.com/v6/latest/USD",
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        rate = data.get("rates", {}).get("INR")
        return float(rate) if rate else None
    except Exception as exc:
        logger.warning("USD/INR fetch failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Provider 3 — pure open fallback (exchangerate-api + fixed gold/silver USD)
# For when no API keys are configured, uses live USD/INR + hardcoded spot
# (only useful for CI/demo mode — prices will be stale but not crash)
# ---------------------------------------------------------------------------
def _fetch_fallback() -> Optional[dict]:
    """
    Open fallback: uses live USD/INR + approximate gold/silver spot.
    Accuracy: ~5-10% off. Suitable only when no API keys are configured.
    """
    usd_inr = _get_usd_inr_rate()
    if not usd_inr:
        return None
    # These are rough approximate values — updated manually every few months
    GOLD_USD_PER_OZ_APPROX = 2350.0
    SILVER_USD_PER_OZ_APPROX = 29.5
    gold_24k = round((GOLD_USD_PER_OZ_APPROX * usd_inr) / GRAMS_PER_TROY_OZ, 2)
    gold_22k = round(gold_24k * GOLD_PURITY_22K, 2)
    silver = round((SILVER_USD_PER_OZ_APPROX * usd_inr) / GRAMS_PER_TROY_OZ, 2)
    logger.info("fallback rates (approx): gold24k=%.2f silver=%.2f INR/g", gold_24k, silver)
    return {
        "gold_24k": gold_24k,
        "gold_22k": gold_22k,
        "silver": silver,
        "source": "fallback_approx",
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def fetch_live_rates() -> Optional[dict]:
    """
    Try each provider in order; return the first successful result.
    Returns None if all providers fail (network issue, no keys, etc.)
    """
    for provider in (_fetch_metalpriceapi, _fetch_goldapi, _fetch_fallback):
        result = provider()
        if result:
            return result
    logger.error("All metal rate providers failed")
    return None


def save_rates_to_db(db, rates: dict) -> int:
    """
    Write fetched rates into the MetalRate table.
    Creates a new record for each metal type.
    Returns count of records inserted.
    """
    from models.rates_config import MetalRate

    metal_map = {
        "gold_24k": ("gold", "gram"),
        "gold_22k": ("gold_22k", "gram"),
        "silver": ("silver", "gram"),
    }
    now = datetime.now(timezone.utc)
    inserted = 0
    for key, (metal_type, unit) in metal_map.items():
        value = rates.get(key)
        if value is None:
            continue
        record = MetalRate(
            metal_type=metal_type,
            rate_per_unit=value,
            unit=unit,
            effective_from=now,
        )
        db.add(record)
        inserted += 1
    # Commit with retries to tolerate transient DB disconnects (Railway/remote MySQL)
    max_attempts = 3
    backoff = 1
    for attempt in range(1, max_attempts + 1):
        try:
            db.commit()
            logger.info("Saved %d metal rate record(s) from %s", inserted, rates.get("source", "unknown"))
            break
        except (SAOperationalError, pymysql.err.OperationalError) as exc:
            db.rollback()
            logger.warning(
                "DB commit attempt %d/%d failed: %s",
                attempt,
                max_attempts,
                exc,
            )
            if attempt == max_attempts:
                logger.exception("Failed to commit metal rates after %d attempts", max_attempts)
                raise
            time.sleep(backoff)
            backoff *= 2
    return inserted


def job_refresh_metal_rates(session_factory) -> None:
    """
    APScheduler job — fetch and store latest metal rates.
    Called every 60 minutes by the background scheduler.
    """
    db = session_factory()
    try:
        rates = fetch_live_rates()
        if rates:
            save_rates_to_db(db, rates)
        else:
            logger.warning("job_refresh_metal_rates: no rates fetched, skipping DB write")
    except Exception as exc:
        logger.exception("job_refresh_metal_rates error: %s", exc)
        db.rollback()
    finally:
        db.close()
