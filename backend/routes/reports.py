"""
routes/reports.py — FEAT-04: Reports Export (Excel / CSV)

Endpoints:
  GET /api/reports/transactions/csv        — export transactions as CSV
  GET /api/reports/transactions/excel      — export transactions as Excel (.xlsx)
  GET /api/reports/customers/csv           — export customer list as CSV
  GET /api/reports/girvi/csv               — export active girvi loans as CSV

All exports:
  - Require manager+ role
  - Respect store isolation (store_id from JWT)
  - Support date range filter: ?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD
  - Streamed as file download (Content-Disposition: attachment)

Dependencies:
  - csv / io (stdlib — no extra install)
  - openpyxl (for Excel — `pip install openpyxl`, already in requirements.txt usually)
    If openpyxl is unavailable the Excel endpoint falls back to CSV with a warning.
"""

import csv
import io
import logging
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from config.database import get_db
from core.db_filters import apply_store_filter
from dependencies import require_manager
from models.customer import Customer
from models.transactional import Transaction

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Reports"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _date_filter(q, model, from_date: Optional[date], to_date: Optional[date]):
    """Apply date range filter on model.created_at (if the attribute exists)."""
    created_at = getattr(model, "created_at", None)
    if created_at is None:
        return q
    if from_date:
        q = q.filter(model.created_at >= datetime.combine(from_date, datetime.min.time()))
    if to_date:
        q = q.filter(model.created_at <= datetime.combine(to_date, datetime.max.time()))
    return q


def _stream_csv(rows: list[dict], filename: str) -> StreamingResponse:
    if not rows:
        output = io.StringIO()
        output.write("No data found\n")
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _stream_excel(rows: list[dict], filename: str) -> StreamingResponse:
    """Stream an Excel .xlsx file. Falls back to CSV if openpyxl not installed."""
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill
    except ImportError:
        logger.warning("openpyxl not installed — falling back to CSV for Excel export")
        return _stream_csv(rows, filename.replace(".xlsx", ".csv"))

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Report"

    if rows:
        headers = list(rows[0].keys())
        # Header row styling
        header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")
        for col_idx, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col_idx, value=header.replace("_", " ").title())
            cell.fill = header_fill
            cell.font = header_font

        # Data rows
        for row_idx, row in enumerate(rows, start=2):
            for col_idx, key in enumerate(headers, start=1):
                ws.cell(row=row_idx, column=col_idx, value=row.get(key))

        # Auto-fit column widths (approximate)
        for col in ws.columns:
            max_len = max((len(str(cell.value or "")) for cell in col), default=10)
            ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 50)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _safe_float(val) -> Optional[float]:
    try:
        return round(float(val), 2) if val is not None else None
    except (TypeError, ValueError):
        return None


# ── Transactions ──────────────────────────────────────────────────────────────

def _get_transaction_rows(db: Session, payload: dict, from_date, to_date) -> list[dict]:
    q = db.query(Transaction)
    q = apply_store_filter(q, Transaction, payload)
    q = _date_filter(q, Transaction, from_date, to_date)
    q = q.order_by(Transaction.created_at.desc())
    rows = []
    for t in q.all():
        rows.append({
            "id": t.id,
            "invoice_number": getattr(t, "invoice_number", ""),
            "date": t.created_at.date().isoformat() if t.created_at else "",
            "customer_name": t.customer_name or "",
            "customer_phone": getattr(t, "customer_phone", ""),
            "total_amount": _safe_float(t.total_amount),
            "paid_amount": _safe_float(t.paid_amount),
            "due_amount": _safe_float(t.due_amount),
            "payment_mode": getattr(t, "payment_mode", ""),
            "status": getattr(t, "status", ""),
            "notes": getattr(t, "notes", ""),
        })
    return rows


@router.get("/transactions/csv")
def export_transactions_csv(
    from_date: Optional[date] = Query(None, description="Start date YYYY-MM-DD"),
    to_date: Optional[date] = Query(None, description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_manager),
):
    """Export transactions to CSV. Requires manager role."""
    today = date.today().isoformat()
    rows = _get_transaction_rows(db, payload, from_date, to_date)
    return _stream_csv(rows, f"transactions_{today}.csv")


@router.get("/transactions/excel")
def export_transactions_excel(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_manager),
):
    """Export transactions to Excel (.xlsx). Requires manager role."""
    today = date.today().isoformat()
    rows = _get_transaction_rows(db, payload, from_date, to_date)
    return _stream_excel(rows, f"transactions_{today}.xlsx")


# ── Customers ─────────────────────────────────────────────────────────────────

@router.get("/customers/csv")
def export_customers_csv(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_manager),
):
    """Export customer list to CSV. Requires manager role."""
    q = db.query(Customer)
    q = apply_store_filter(q, Customer, payload)
    q = _date_filter(q, Customer, from_date, to_date)
    q = q.order_by(Customer.name)
    rows = []
    for c in q.all():
        rows.append({
            "id": c.id,
            "name": c.name or "",
            "phone": c.primary_phone or "",
            "email": getattr(c, "email", "") or "",
            "address": getattr(c, "address", "") or "",
            "city": getattr(c, "city", "") or "",
            "tags": getattr(c, "tags", "") or "",
            "is_active": getattr(c, "is_active", True),
            "created_at": c.created_at.date().isoformat() if getattr(c, "created_at", None) else "",
        })
    today = date.today().isoformat()
    return _stream_csv(rows, f"customers_{today}.csv")


# ── Girvi loans ───────────────────────────────────────────────────────────────

@router.get("/girvi/csv")
def export_girvi_csv(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_manager),
):
    """Export active Girvi (pledge) loans to CSV. Requires manager role."""
    from models.girvi_loan import GirviLoan
    q = db.query(GirviLoan)
    q = apply_store_filter(q, GirviLoan, payload)
    q = _date_filter(q, GirviLoan, from_date, to_date)
    q = q.order_by(GirviLoan.created_at.desc())
    rows = []
    for g in q.all():
        rows.append({
            "id": g.id,
            "ticket_number": getattr(g, "ticket_number", ""),
            "customer_name": getattr(g, "customer_name", ""),
            "customer_phone": getattr(g, "customer_phone", ""),
            "loan_amount": _safe_float(getattr(g, "loan_amount", None)),
            "interest_rate": _safe_float(getattr(g, "interest_rate", None)),
            "metal_type": getattr(g, "metal_type", ""),
            "weight_grams": _safe_float(getattr(g, "weight_grams", None)),
            "status": getattr(g, "status", ""),
            "pledge_date": g.created_at.date().isoformat() if getattr(g, "created_at", None) else "",
            "due_date": getattr(g, "due_date", ""),
            "notes": getattr(g, "notes", "") or "",
        })
    today = date.today().isoformat()
    return _stream_csv(rows, f"girvi_loans_{today}.csv")
