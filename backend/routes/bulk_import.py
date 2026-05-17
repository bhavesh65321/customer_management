"""
routes/bulk_import.py — FEAT-03: Bulk Customer Import via CSV

Endpoint:
  POST /api/bulk-import/customers   — Upload a CSV file, parse rows, create customers

CSV expected columns (case-insensitive, extra columns ignored):
  name*, phone*, email, address, city, notes, tags
  (* = required)

Business rules:
  - Duplicate phone numbers (within same store) are skipped, not errored
  - Invalid rows are collected and returned in the response (not silently dropped)
  - Max 500 rows per upload (plan limit may further restrict)
  - Uses the existing Customer model — fully integrated with store isolation

Response:
  {
    "created": 12,
    "skipped_duplicates": 3,
    "invalid_rows": [{"row": 5, "reason": "Missing name"}],
    "total_rows": 15
  }
"""

import csv
import io
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from config.database import get_db
from dependencies import require_staff
from models.customer import Customer
from utils.activity import log_activity

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Bulk Import"])

# Max rows per CSV upload
_MAX_ROWS = 500

# Required CSV columns (after normalisation to lowercase+strip)
_REQUIRED_COLS = {"name", "phone"}

# Optional columns mapped to Customer model fields
_OPTIONAL_COL_MAP = {
    "email": "email",
    "address": "address",
    "city": "city",
    "notes": "notes",
    "tags": "tags",
}


def _normalise_header(raw: str) -> str:
    return raw.strip().lower().replace(" ", "_")


def _parse_csv(content: bytes) -> tuple[list[dict], list[str]]:
    """
    Parse CSV bytes into list of row dicts.
    Returns (rows, errors) where errors are file-level issues.
    """
    try:
        text = content.decode("utf-8-sig")  # handle BOM from Excel exports
    except UnicodeDecodeError:
        try:
            text = content.decode("latin-1")
        except Exception:
            return [], ["File encoding not supported. Use UTF-8 or Latin-1."]

    reader = csv.DictReader(io.StringIO(text))
    headers = [_normalise_header(h) for h in (reader.fieldnames or [])]
    missing_required = _REQUIRED_COLS - set(headers)
    if missing_required:
        return [], [f"CSV missing required columns: {', '.join(sorted(missing_required))}"]

    rows = []
    for i, raw_row in enumerate(reader, start=2):  # row 1 = header
        normalised = {_normalise_header(k): (v or "").strip() for k, v in raw_row.items()}
        normalised["_row_num"] = i
        rows.append(normalised)
        if len(rows) > _MAX_ROWS:
            break  # hard cap — we'll error below

    return rows, []


@router.post("/customers")
async def bulk_import_customers(
    file: UploadFile = File(..., description="CSV file with customer data"),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    """
    FEAT-03: Import customers in bulk from a CSV file.

    **CSV Format** (first row = headers):
    ```
    name,phone,email,address,city,notes,tags
    Ravi Kumar,9876543210,ravi@example.com,123 Main St,Mumbai,"VIP customer","gold,diamond"
    ```

    - `name` and `phone` are required; all other columns are optional.
    - Rows with duplicate phone numbers (per store) are skipped.
    - Max 500 rows per upload.
    """
    store_id = payload.get("store_id")

    # ── Validate file type ──────────────────────────────────────────────────
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, detail="Only CSV files are accepted (.csv extension required)")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5 MB cap
        raise HTTPException(413, detail="File too large. Maximum CSV size is 5 MB.")

    # ── Parse CSV ───────────────────────────────────────────────────────────
    rows, parse_errors = _parse_csv(content)
    if parse_errors:
        raise HTTPException(400, detail={"error": "csv_parse_error", "issues": parse_errors})

    if len(rows) > _MAX_ROWS:
        raise HTTPException(
            400,
            detail=f"CSV has more than {_MAX_ROWS} rows. Split into smaller files.",
        )

    # ── Pre-load existing phones for this store (for dup check) ────────────
    existing_phones: set[str] = set()
    if store_id:
        phones_in_db = db.query(Customer.primary_phone).filter(
            Customer.store_id == store_id
        ).all()
        existing_phones = {r[0] for r in phones_in_db if r[0]}

    # ── Process each row ────────────────────────────────────────────────────
    created = 0
    skipped_duplicates = 0
    invalid_rows: List[dict] = []
    phones_seen_this_upload: set[str] = set()

    for row in rows:
        row_num = row.get("_row_num", "?")
        name = row.get("name", "").strip()
        phone = row.get("phone", "").strip()

        # Validate required fields
        if not name:
            invalid_rows.append({"row": row_num, "reason": "Missing name"})
            continue
        if not phone:
            invalid_rows.append({"row": row_num, "reason": "Missing phone"})
            continue

        # Normalise phone (strip spaces, dashes)
        phone_clean = "".join(c for c in phone if c.isdigit() or c == "+")

        # Duplicate check
        if phone_clean in existing_phones or phone_clean in phones_seen_this_upload:
            skipped_duplicates += 1
            continue

        # Build Customer record
        customer = Customer(
            name=name,
            primary_phone=phone_clean,
            store_id=store_id,
        )
        for csv_col, model_field in _OPTIONAL_COL_MAP.items():
            val = row.get(csv_col, "").strip()
            if val:
                setattr(customer, model_field, val)

        db.add(customer)
        phones_seen_this_upload.add(phone_clean)
        created += 1

    # ── Commit ──────────────────────────────────────────────────────────────
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("bulk_import commit failed: %s", exc)
        raise HTTPException(500, detail="Database error while saving customers. Please try again.")

    log_activity(
        db,
        payload,
        action="bulk_imported",
        entity_type="customer",
        entity_id=None,
        message=f"Bulk imported {created} customer(s) from CSV ({skipped_duplicates} duplicates skipped)",
        store_id=store_id,
    )

    return {
        "created": created,
        "skipped_duplicates": skipped_duplicates,
        "invalid_rows": invalid_rows,
        "total_rows": len(rows),
    }
