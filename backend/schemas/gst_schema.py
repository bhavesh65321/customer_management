"""
Pydantic schemas for GST settings, calculation, and reports.
"""

import re
from typing import Optional
from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# GSTIN validator (reusable)
# ---------------------------------------------------------------------------

_GSTIN_RE = re.compile(
    r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
)


def _validate_gstin(v: Optional[str]) -> Optional[str]:
    if not v or v.strip() == "":
        return None
    cleaned = v.strip().upper()
    if not _GSTIN_RE.match(cleaned):
        raise ValueError("Invalid GSTIN format. Example: 27AABCG1234L1ZX")
    return cleaned


# ---------------------------------------------------------------------------
# Store GST Settings
# ---------------------------------------------------------------------------

class GSTSettingsUpdate(BaseModel):
    """Admin uses this to configure the store's GST details."""
    gstin: Optional[str] = Field(None, description="Store GSTIN — e.g. 27AABCG1234L1ZX")
    state_code: Optional[str] = Field(None, description="2-digit state code — e.g. 27 for Maharashtra")
    invoice_prefix: Optional[str] = Field(None, max_length=6, description="Short prefix for invoice numbers — e.g. GP")
    default_hsn_gold: Optional[str] = Field(None, description="HSN for gold items, default 7113")
    default_hsn_silver: Optional[str] = Field(None, description="HSN for silver items, default 7114")
    default_hsn_making: Optional[str] = Field(None, description="HSN for making charges, default 9988")
    default_hsn_diamond: Optional[str] = Field(None, description="HSN for diamond items, default 7102")

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, v):
        return _validate_gstin(v)

    @field_validator("invoice_prefix")
    @classmethod
    def validate_prefix(cls, v):
        if v is None:
            return v
        cleaned = re.sub(r"[^A-Za-z0-9]", "", v).upper()
        if not cleaned:
            raise ValueError("Invoice prefix must contain at least one alphanumeric character")
        return cleaned[:6]


class GSTSettingsOut(BaseModel):
    """Returned when reading GST config for a store."""
    id: int
    name: str
    gstin: Optional[str]
    state_code: Optional[str]
    invoice_prefix: Optional[str]
    invoice_seq_current: Optional[int]
    default_hsn_gold: Optional[str]
    default_hsn_silver: Optional[str]
    default_hsn_making: Optional[str]
    default_hsn_diamond: Optional[str]

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# GST input on billing screen
# ---------------------------------------------------------------------------

class GSTLineInput(BaseModel):
    """
    Staff fills this on the billing screen before saving a bill.
    All fields are optional — if omitted, defaults come from store config.
    """
    hsn_code: Optional[str] = Field(None, description="HSN for main item — e.g. 7113")
    making_charges: Optional[float] = Field(0.0, ge=0, description="Making / labour charges (₹)")
    customer_gstin: Optional[str] = Field(None, description="Customer GSTIN — leave blank for retail")
    is_interstate: Optional[bool] = Field(False, description="True if customer is in a different state")

    @field_validator("customer_gstin")
    @classmethod
    def validate_customer_gstin(cls, v):
        return _validate_gstin(v)


# ---------------------------------------------------------------------------
# GST breakdown — returned in invoice / calculate preview
# ---------------------------------------------------------------------------

class GSTBreakdown(BaseModel):
    hsn_code: Optional[str]
    making_hsn_code: Optional[str]
    tax_rate: float
    making_tax_rate: float
    taxable_value: float
    making_charges: float
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    making_cgst: float
    making_sgst: float
    making_igst: float
    is_interstate: bool
    customer_gstin: Optional[str]
    invoice_number: Optional[str]
    total_tax: float
    grand_total: float


# ---------------------------------------------------------------------------
# GSTR-1 sub-schemas
# ---------------------------------------------------------------------------

class B2BInvoiceRow(BaseModel):
    invoice_number: str
    invoice_date: str
    customer_name: str
    customer_gstin: str
    hsn_code: Optional[str]
    taxable_value: float
    cgst: float
    sgst: float
    igst: float
    total_tax: float
    invoice_total: float


class B2CLargeRow(BaseModel):
    invoice_number: str
    invoice_date: str
    customer_name: str
    hsn_code: Optional[str]
    taxable_value: float
    cgst: float
    sgst: float
    igst: float
    invoice_total: float


class B2CSmallSummary(BaseModel):
    month: str
    total_taxable_value: float
    total_cgst: float
    total_sgst: float
    total_igst: float
    total_tax: float
    total_invoice_value: float


class HSNRow(BaseModel):
    hsn_code: str
    description: str
    total_quantity: float
    total_value: float
    total_cgst: float
    total_sgst: float
    total_igst: float
    total_tax: float


# ---------------------------------------------------------------------------
# Full report schemas
# ---------------------------------------------------------------------------

class GSTR1Report(BaseModel):
    store_name: str
    gstin: Optional[str]
    month: int
    year: int
    period_label: str
    b2b: list[B2BInvoiceRow]
    b2c_large: list[B2CLargeRow]
    b2c_small: B2CSmallSummary
    hsn_summary: list[HSNRow]
    total_taxable_value: float
    total_cgst: float
    total_sgst: float
    total_igst: float
    total_tax_collected: float


class GSTR3BSummary(BaseModel):
    store_name: str
    gstin: Optional[str]
    month: int
    year: int
    period_label: str
    total_sales: float
    total_taxable_value: float
    total_cgst: float
    total_sgst: float
    total_igst: float
    total_tax_payable: float
    b2b_sales: float
    b2c_sales: float
    interstate_sales: float
    intrastate_sales: float
