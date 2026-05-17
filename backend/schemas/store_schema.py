from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date


class StoreCreate(BaseModel):
    name: str = Field(..., max_length=255)
    gstin: Optional[str] = Field(None, max_length=20)
    bis_reg: Optional[str] = Field(None, max_length=100)
    join_date: Optional[date] = None
    license_expiry: Optional[date] = None
    address: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=20)
    is_active: bool = True
    license_type: Optional[str] = Field(None, pattern="^(general|simple|premium)$")
    company_id: Optional[str] = Field(None, max_length=50, description="Custom unique Company ID. Auto-generated if omitted.")
    owner_name: Optional[str] = Field(None, max_length=150)
    owner_email: Optional[str] = Field(None, max_length=150)


class StoreResponse(BaseModel):
    id: int
    name: str
    gstin: Optional[str] = None
    bis_reg: Optional[str] = None
    company_id: Optional[str] = None
    join_date: Optional[date] = None
    license_expiry: Optional[date] = None
    address: Optional[str] = None
    location: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: bool = True
    license_type: Optional[str] = None
    logo_url: Optional[str] = None
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        # map DB column customer_code → company_id in the serialized output
        instance = super().from_orm(obj)
        if instance.company_id is None and hasattr(obj, "customer_code"):
            instance.company_id = obj.customer_code
        return instance


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    gstin: Optional[str] = None
    bis_reg: Optional[str] = None
    join_date: Optional[date] = None
    license_expiry: Optional[date] = None
    address: Optional[str] = None
    location: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None
    license_type: Optional[str] = Field(None, pattern="^(general|simple|premium)$")
    logo_url: Optional[str] = None
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None


# ---------------------------------------------------------------------------
# Store + Users detail view (admin)
# ---------------------------------------------------------------------------

class StoreUserSummary(BaseModel):
    id: int
    name: Optional[str]
    email: str
    role: str
    is_active: bool = True
    designation: Optional[str] = None

    class Config:
        from_attributes = True


class StoreDetailResponse(StoreResponse):
    """Extended store response that includes the list of users belonging to this store."""
    users: List[StoreUserSummary] = []


# ---------------------------------------------------------------------------
# Custom code assignment
# ---------------------------------------------------------------------------

class StoreCodeAssign(BaseModel):
    code: str = Field(..., min_length=3, max_length=50, description="New unique Company ID (letters, digits, hyphens only)")


# ---------------------------------------------------------------------------
# Full store onboarding (store + optional manager account in one step)
# ---------------------------------------------------------------------------

class StoreManagerCreate(BaseModel):
    """Optional manager/owner account to create alongside the store."""
    name: str = Field(..., max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=256)
    role: str = Field("manager", pattern="^(admin|manager|staff)$")
    designation: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)


class StoreOnboardRequest(BaseModel):
    """Create a new store and optionally a manager account in a single call."""
    store: StoreCreate
    manager: Optional[StoreManagerCreate] = None


class StoreOnboardResponse(BaseModel):
    store: StoreResponse
    company_id: str = Field(..., description="Unique Company ID to share with staff for self-registration")
    manager_created: bool = False
    manager_email: Optional[str] = None
    message: str
