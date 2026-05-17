"""
GST calculation utilities for Indian jewellery shops.

Jewellery GST rates (2024-25):
  Gold jewellery & articles  → HSN 7113 → 3%
  Silver jewellery           → HSN 7114 → 3%
  Diamond jewellery          → HSN 7102 → 3%
  Gold coins / bars          → HSN 7108 → 3%
  Making charges (job work)  → HSN 9988 → 5%

Intra-state sale:  CGST (half rate) + SGST (half rate)
Inter-state sale:  IGST (full rate)
"""

from typing import Optional

# ---------------------------------------------------------------------------
# Reference tables
# ---------------------------------------------------------------------------

HSN_DESCRIPTIONS = {
    "7113": "Gold Jewellery & Articles",
    "7114": "Silver Jewellery & Articles",
    "7102": "Diamond / Precious Stones Jewellery",
    "7108": "Gold Coins & Bars",
    "7106": "Silver Coins & Bars",
    "9988": "Making Charges / Job Work",
}

HSN_TAX_RATES: dict[str, float] = {
    "7113": 3.0,
    "7114": 3.0,
    "7102": 3.0,
    "7108": 3.0,
    "7106": 3.0,
    "9988": 5.0,
}

# Invoices ≥ ₹2.5L without GSTIN → reported as B2C Large in GSTR-1
B2C_LARGE_THRESHOLD = 250_000.0

INDIAN_STATE_CODES: dict[str, str] = {
    "01": "Jammu & Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "25": "Daman & Diu",
    "26": "Dadra & Nagar Haveli",
    "27": "Maharashtra",
    "28": "Andhra Pradesh",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman & Nicobar",
    "36": "Telangana",
    "37": "Andhra Pradesh (New)",
    "38": "Ladakh",
}


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------

def get_tax_rate(hsn_code: Optional[str], default_rate: float = 3.0) -> float:
    """Return GST % for a given HSN code."""
    if not hsn_code:
        return default_rate
    return HSN_TAX_RATES.get(hsn_code, default_rate)


def get_hsn_description(hsn_code: Optional[str]) -> str:
    if not hsn_code:
        return "Unknown"
    return HSN_DESCRIPTIONS.get(hsn_code, f"HSN {hsn_code}")


# ---------------------------------------------------------------------------
# Core GST calculator
# ---------------------------------------------------------------------------

def calculate_gst(
    item_value: float,
    making_charges: float = 0.0,
    hsn_code: str = "7113",
    making_hsn_code: str = "9988",
    is_interstate: bool = False,
) -> dict:
    """
    Calculate full GST breakdown for a jewellery transaction.

    Parameters
    ----------
    item_value      : taxable value of the jewellery item (excl. making charges)
    making_charges  : making / labour charge amount
    hsn_code        : HSN for the main item  (default 7113 = gold jewellery)
    making_hsn_code : HSN for making charges (default 9988 = job work)
    is_interstate   : True → IGST only; False → CGST + SGST split

    Returns a flat dict with every field needed to store on the Transaction row.
    """
    item_value = round(float(item_value or 0), 2)
    making_charges = round(float(making_charges or 0), 2)

    item_tax_rate = get_tax_rate(hsn_code)
    making_tax_rate = get_tax_rate(making_hsn_code)

    # --- item GST ---
    item_tax = round(item_value * item_tax_rate / 100, 2)
    if is_interstate:
        item_cgst, item_sgst, item_igst = 0.0, 0.0, item_tax
    else:
        item_cgst = round(item_tax / 2, 2)
        item_sgst = round(item_tax / 2, 2)
        item_igst = 0.0

    # --- making charges GST ---
    making_tax = round(making_charges * making_tax_rate / 100, 2)
    if is_interstate:
        making_cgst, making_sgst, making_igst = 0.0, 0.0, making_tax
    else:
        making_cgst = round(making_tax / 2, 2)
        making_sgst = round(making_tax / 2, 2)
        making_igst = 0.0

    total_cgst = round(item_cgst + making_cgst, 2)
    total_sgst = round(item_sgst + making_sgst, 2)
    total_igst = round(item_igst + making_igst, 2)
    total_tax = round(total_cgst + total_sgst + total_igst, 2)
    grand_total = round(item_value + making_charges + total_tax, 2)

    return {
        "hsn_code":          hsn_code,
        "tax_rate":          item_tax_rate,
        "taxable_value":     item_value,
        "item_cgst":         item_cgst,
        "item_sgst":         item_sgst,
        "item_igst":         item_igst,
        "making_hsn_code":   making_hsn_code,
        "making_tax_rate":   making_tax_rate,
        "making_charges":    making_charges,
        "making_cgst":       making_cgst,
        "making_sgst":       making_sgst,
        "making_igst":       making_igst,
        "cgst_amount":       total_cgst,
        "sgst_amount":       total_sgst,
        "igst_amount":       total_igst,
        "total_tax":         total_tax,
        "grand_total":       grand_total,
        "is_interstate":     is_interstate,
    }


# ---------------------------------------------------------------------------
# Invoice number helpers
# ---------------------------------------------------------------------------

def get_financial_year(year: int, month: int) -> str:
    """
    Return 4-char FY string.
      Apr 2026 – Mar 2027  →  "2627"
      Jan 2026 – Mar 2026  →  "2526"
    """
    if month >= 4:
        return f"{str(year)[2:]}{str(year + 1)[2:]}"
    return f"{str(year - 1)[2:]}{str(year)[2:]}"


def generate_invoice_number(prefix: str, financial_year: str, sequence: int) -> str:
    """
    Build a GST-compliant invoice number.
    e.g.  prefix=GP, fy=2526, seq=47  →  GP/2526/047
    """
    return f"{prefix.upper()}/{financial_year}/{str(sequence).zfill(3)}"
