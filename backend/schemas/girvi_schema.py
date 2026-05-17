from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from datetime import date, datetime

# ── Business limits (SEC-09) ─────────────────────────────────────────────────
# These can be overridden per-store in the future via RatesConfig.
MAX_PRINCIPAL_AMOUNT = 10_000_000   # ₹1 crore maximum loan
MIN_PRINCIPAL_AMOUNT = 100           # ₹100 minimum loan
MAX_INTEREST_RATE_PER_MONTH = 10.0  # 10% per month (120% p.a.) — regulatory cap
MIN_INTEREST_RATE_PER_MONTH = 0.1   # 0.1% per month floor


class GirviPhotoCreate(BaseModel):
    image_url: str


class GirviPhotoResponse(BaseModel):
    id: int
    loan_id: int
    image_url: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GirviLoanCreate(BaseModel):
    customer_id: int
    jewelry_description: str
    gross_weight: Optional[float] = None
    purity: Optional[float] = None
    principal_amount: float
    interest_rate_per_month: float
    start_date: date
    notes: Optional[str] = None
    photo_urls: Optional[List[str]] = []

    @field_validator("principal_amount")
    @classmethod
    def validate_principal(cls, v: float) -> float:
        if v < MIN_PRINCIPAL_AMOUNT:
            raise ValueError(f"Principal amount must be at least ₹{MIN_PRINCIPAL_AMOUNT}")
        if v > MAX_PRINCIPAL_AMOUNT:
            raise ValueError(f"Principal amount cannot exceed ₹{MAX_PRINCIPAL_AMOUNT:,}")
        return round(v, 2)

    @field_validator("interest_rate_per_month")
    @classmethod
    def validate_interest_rate(cls, v: float) -> float:
        if v < MIN_INTEREST_RATE_PER_MONTH:
            raise ValueError(
                f"Interest rate must be at least {MIN_INTEREST_RATE_PER_MONTH}% per month"
            )
        if v > MAX_INTEREST_RATE_PER_MONTH:
            raise ValueError(
                f"Interest rate cannot exceed {MAX_INTEREST_RATE_PER_MONTH}% per month "
                f"(RBI regulatory cap)"
            )
        return round(v, 4)

    @field_validator("jewelry_description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Jewelry description must be at least 3 characters")
        if len(v) > 500:
            raise ValueError("Jewelry description cannot exceed 500 characters")
        return v

    @model_validator(mode="after")
    def validate_start_date(self) -> "GirviLoanCreate":
        from datetime import date as date_cls
        today = date_cls.today()
        if self.start_date > today:
            raise ValueError("Loan start date cannot be in the future")
        return self


class GirviLoanUpdate(BaseModel):
    jewelry_description: Optional[str] = None
    gross_weight: Optional[float] = None
    purity: Optional[float] = None
    notes: Optional[str] = None


class GirviLoanResponse(BaseModel):
    id: int
    store_id: int
    customer_id: int
    jewelry_description: str
    gross_weight: Optional[float] = None
    purity: Optional[float] = None
    principal_amount: float
    interest_rate_per_month: float
    start_date: date
    status: str
    closed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    notes: Optional[str] = None
    customer_name: Optional[str] = None
    photos: Optional[List[GirviPhotoResponse]] = []

    class Config:
        from_attributes = True


class GirviInterestPaymentCreate(BaseModel):
    amount: float
    for_month: Optional[str] = None
    notes: Optional[str] = None


class GirviInterestPaymentResponse(BaseModel):
    id: int
    loan_id: int
    amount: float
    for_month: Optional[str] = None
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class GirviInterestSummary(BaseModel):
    loan_id: int
    principal: float
    rate_per_month: float
    months_elapsed: int
    total_interest_due: float
    total_interest_paid: float
    interest_outstanding: float
