from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.orm import Session

from config.database import get_db
from dependencies import require_staff
from services.business_ai_review import generate_business_review
from services.business_snapshot import build_business_snapshot

router = APIRouter(tags=["AI Business Review"])


@router.get("/business-metrics")
def get_business_metrics(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
) -> Dict[str, Any]:
    return build_business_snapshot(db, payload)


class BusinessReviewRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    horizon_months: int = Field(default=6, alias="horizonMonths")

    @field_validator("horizon_months")
    @classmethod
    def horizon_ok(cls, v: int) -> int:
        if v not in (3, 6, 12):
            return 6
        return v


@router.post("/business-review")
def post_business_review(
    body: Optional[BusinessReviewRequest] = Body(None),
    include_snapshot: bool = Query(False, alias="includeSnapshot"),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
) -> Dict[str, Any]:
    req = body or BusinessReviewRequest()
    snapshot = build_business_snapshot(db, payload)
    review = generate_business_review(snapshot, req.horizon_months)
    out: Dict[str, Any] = {
        "horizonMonths": req.horizon_months,
        "source": review["source"],
        "model": review.get("model"),
        "structured": review["structured"],
        "disclaimer": (
            "This review is informational and generated from your shop data (and optional AI). "
            "It is not financial, legal, or tax advice. Verify decisions with your accountant and ground team."
        ),
    }
    if review.get("warning"):
        out["warning"] = review["warning"]
    if include_snapshot:
        out["snapshot"] = snapshot
    return out


@router.get("/business-review")
def get_business_review(
    horizon_months: int = Query(6, alias="horizonMonths"),
    include_snapshot: bool = Query(False, alias="includeSnapshot"),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
) -> Dict[str, Any]:
    hm = horizon_months if horizon_months in (3, 6, 12) else 6
    snapshot = build_business_snapshot(db, payload)
    review = generate_business_review(snapshot, hm)
    out: Dict[str, Any] = {
        "horizonMonths": hm,
        "source": review["source"],
        "model": review.get("model"),
        "structured": review["structured"],
        "disclaimer": (
            "This review is informational and generated from your shop data (and optional AI). "
            "It is not financial, legal, or tax advice."
        ),
    }
    if review.get("warning"):
        out["warning"] = review["warning"]
    if include_snapshot:
        out["snapshot"] = snapshot
    return out


# ── AI Assistant Chat endpoint ────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str       # "user" | "assistant"
    content: str

class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[ChatMessage] = Field(default_factory=list)

SYSTEM_PROMPT = """You are Jewellery Manager AI — an expert assistant for Indian jewellery shop owners using the Jewellery Manager platform.

You have two roles:
1. BUSINESS ADVISOR: Answer questions about the shop's performance using the live business snapshot provided.
2. PRODUCT GUIDE: Help users navigate and use the Jewellery Manager platform features.

Platform features you can guide users on:
- Customers: Add at /addCustomer, view all at /customerDashboard
- Bills & Transactions: Create at /buyProduct, view at /daily-sales and /payments
- Girvi (Pledge Loans): Manage at /girvi — create loans, track interest, release pledges
- Inventory: Track pieces at /inventory/pieces — serial numbers, weight, purity
- Stock: Manage stock items with barcode scanner at /stock
- Orders & Repairs: Create at /orders/new, assign to karigars
- Karigars: Manage artisans at /karigars
- Metal Exchange: Record old gold/silver exchanges at /metal-exchange
- Metal Rates: Set and fetch live rates at /metal-exchange/rates
- WhatsApp Reminders: Send at /reminders
- GST Reports: View at /gst-reports
- Analytics: Charts at /charts, insights at /insights
- Loyalty Points: Award and redeem customer points
- Bulk Import: Import customers via CSV at /import-customers
- Reports Export: Download Excel/CSV from reports endpoints
- Role Permissions: View at /role-permissions
- Billing & Plans: Manage subscription at /billing
- Activity History: Full audit log at /activity-history

Be concise, practical, and use INR (Rs/₹) for currency. Speak like you understand the Indian jewellery trade.
Always respond in the same language the user writes in (Hindi or English).
"""

@router.post("/chat")
def ai_chat(
    body: AIChatRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
) -> Dict[str, Any]:
    """AI Assistant: answers business questions using live shop data + guides product usage."""
    import os, json, urllib.request

    # Build compact live business context
    try:
        snapshot = build_business_snapshot(db, payload)
        s30 = snapshot.get("sales", {}).get("last_30_days", {})
        biz_context = (
            f"LIVE SHOP DATA (last 30 days): "
            f"Bills={s30.get('bill_count', 0)}, "
            f"Billed=Rs{s30.get('billed_total_inr', 0):,.0f}, "
            f"Collected=Rs{s30.get('collected_inr', 0):,.0f}, "
            f"Outstanding=Rs{s30.get('outstanding_due_inr', 0):,.0f}, "
            f"Active Customers={snapshot.get('customers', {}).get('total_active', 0)}, "
            f"Active Girvi={snapshot.get('girvi', {}).get('active_count', 0)}, "
            f"Overdue Orders={snapshot.get('orders_repairs', {}).get('overdue_vs_expected_date', 0)}, "
            f"Low Stock={snapshot.get('stock', {}).get('low_stock_count', 0)}"
        )
    except Exception:
        biz_context = "Live shop data temporarily unavailable."

    api_key = os.environ.get("OPENAI_API_KEY", "")
    # Guard against placeholder value left in .env
    if not api_key or api_key.startswith("your-openai") or api_key == "sk-...":
        return _rule_based_chat(body.message, biz_context)

    messages = [{"role": "system", "content": f"{SYSTEM_PROMPT}\n\n{biz_context}"}]
    for h in body.history[-10:]:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": body.message})

    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    req_body = json.dumps({
        "model": model, "messages": messages,
        "max_tokens": 600, "temperature": 0.5,
    }).encode()

    try:
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=req_body,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read())
        reply = data["choices"][0]["message"]["content"].strip()
        return {"reply": reply, "source": "openai", "model": model}
    except Exception as exc:
        return _rule_based_chat(body.message, biz_context, error=str(exc))


def _rule_based_chat(message: str, biz_context: str, error: str = "") -> Dict[str, Any]:
    """Comprehensive keyword-based fallback when OpenAI is unavailable."""
    msg = message.lower().strip()

    def reply(text: str) -> Dict[str, Any]:
        return {"reply": text, "source": "rule_based", "context": biz_context}

    # ── Greetings ─────────────────────────────────────────────────────────────
    if any(k in msg for k in ("hello", "hi ", "hlo", "hey", "namaste", "namaskar", "good morning",
                               "good afternoon", "good evening", "नमस्ते", "हेलो", "हाय", "शुभ प्रभात")):
        return reply(
            "Namaste! 🙏 I'm your **Jewellery Manager AI**.\n\n"
            "I can help you with:\n"
            "• **Navigate the app** — step-by-step guides for any feature\n"
            "• **Live business data** — your sales, dues, orders, girvi\n"
            "• **Troubleshoot issues** — explain errors or workflow steps\n\n"
            "Try asking: *\"How do I add a girvi loan?\"* or *\"How are my sales this month?\"*"
        )

    # ── Thanks ────────────────────────────────────────────────────────────────
    if any(k in msg for k in ("thank", "thanks", "dhanyawad", "shukriya", "great", "perfect",
                               "excellent", "helpful", "धन्यवाद", "शुक्रिया")):
        return reply("You're welcome! 😊 Let me know if there's anything else I can help you with.")

    # ── Live business / Sales data ────────────────────────────────────────────
    if any(k in msg for k in ("sales", "revenue", "billed", "collection", "outstanding", "due amount",
                               "how is my business", "business performance", "business summary",
                               "how much", "how many customers", "active customers", "total sales",
                               "girvi count", "overdue", "low stock count", "snapshot",
                               "बिक्री", "राजस्व", "बकाया", "ग्राहक कितने", "व्यवसाय कैसा")):
        return reply(
            f"📊 **Your Live Business Snapshot:**\n\n{biz_context}\n\n"
            "For a full AI-powered analysis with forecasts and recommendations, "
            "visit **AI Business Review** → `/jewellery-business`"
        )

    # ── Add / Manage Customer ─────────────────────────────────────────────────
    if any(k in msg for k in ("add customer", "new customer", "create customer", "customer add",
                               "how to add", "register customer", "नया ग्राहक", "ग्राहक जोड़")):
        return reply(
            "**How to Add a New Customer:**\n\n"
            "1. Click **Customers** in the sidebar → `/customerDashboard`\n"
            "2. Click the **➕ Add New Customer** button (top-right)\n"
            "3. Fill in: Name, Primary Phone (required), then optional Email, Address, City\n"
            "4. Click **Save Customer**\n\n"
            "💡 Tip: You can also **import customers in bulk** via Excel at `/import-customers`"
        )

    # ── View / Search Customers ────────────────────────────────────────────────
    if any(k in msg for k in ("view customer", "customer list", "search customer", "find customer",
                               "customer dashboard", "all customers", "ग्राहक देखें", "ग्राहक सूची")):
        return reply(
            "**Customer Management:**\n\n"
            "• **View all customers** → `/customerDashboard`\n"
            "• Use the **search bar** to find by name or phone number\n"
            "• Filter by **Active / Inactive / All**\n"
            "• Click any customer row to see their full profile, purchase history, and dues\n\n"
            "💡 Tip: Click **View** on any customer to see their complete account: transactions, girvi, orders, and metal exchange."
        )

    # ── Import Customers ──────────────────────────────────────────────────────
    if any(k in msg for k in ("import customer", "bulk upload", "excel upload", "csv import",
                               "upload customer", "import excel", "ग्राहक आयात", "बल्क")):
        return reply(
            "**How to Import Customers in Bulk:**\n\n"
            "1. Go to **Import Customers** → `/import-customers`\n"
            "2. Download the **Excel template** first\n"
            "3. Fill in: Name (required), Phone (required), then Email, Address, City optionally\n"
            "4. Upload the `.xlsx` file and click **Import**\n\n"
            "✅ Successfully imported customers appear in your customer list instantly."
        )

    # ── Create Bill / Invoice ─────────────────────────────────────────────────
    if any(k in msg for k in ("create bill", "create a bill", "new bill", "make bill", "bill banao",
                               "how to bill", "make invoice", "invoice", "buy product", "sell",
                               "new sale", "record sale", "billing", "बिल बनाएं", "नया बिल",
                               "बिल कैसे", "बिल बनाना", "खरीद")):
        return reply(
            "**How to Create a Bill:**\n\n"
            "1. Click **Create Bill** in the sidebar → `/buyProduct`\n"
            "2. **Search** for the customer by name or phone\n"
            "3. Add products/items with weight, rate, and making charges\n"
            "4. Apply **discount** or **GST** if needed\n"
            "5. Enter amount paid and save — the invoice is generated automatically\n\n"
            "💡 Tip: You can also **upload a photo of a handwritten bill** at `/upload-bill`"
        )

    # ── View Bills / Transactions ─────────────────────────────────────────────
    if any(k in msg for k in ("view bill", "all bills", "transaction history", "daily sales",
                               "past bill", "old bill", "transaction list", "बिल देखें", "लेनदेन")):
        return reply(
            "**Viewing Bills & Transactions:**\n\n"
            "• **Daily Sales** → `/daily-sales` — bills sorted by date with totals\n"
            "• **Payments** → `/payments` — find any bill by Bill ID, customer, or phone\n"
            "• **Customer Profile** → click any customer → Transactions tab\n\n"
            "💡 You can download bills as **PDF** from any transaction detail view."
        )

    # ── Payments / Outstanding ─────────────────────────────────────────────────
    if any(k in msg for k in ("payment", "outstanding payment", "collect payment", "record payment",
                               "pay", "bakaya", "due payment", "pending payment", "भुगतान", "बकाया भुगतान")):
        return reply(
            "**How to Record a Payment:**\n\n"
            "1. Go to **Payments** → `/payments`\n"
            "2. Search by **Bill ID**, **customer name**, or **phone number**\n"
            "3. Select the outstanding bill from the list\n"
            "4. Enter the amount collected and click **Record Payment**\n\n"
            "**Outstanding Balance:** `/payments?tab=outstanding` shows all unpaid bills.\n\n"
            "💡 You can also mark a bill as **Fully Paid** directly from the customer's profile."
        )

    # ── Girvi (Loans) ─────────────────────────────────────────────────────────
    if any(k in msg for k in ("girvi", "loan", "pledge", "gold loan", "silver loan", "mortgage",
                               "गिरवी", "ऋण", "गोल्ड लोन", "ब्याज", "interest on loan")):
        return reply(
            "**Girvi (Pledge Loan) Management:**\n\n"
            "**Create a new Girvi:**\n"
            "1. Go to **Girvi** → `/girvi/new`\n"
            "2. Select the customer, enter metal details (type, weight, purity)\n"
            "3. Set the **loan amount**, **interest rate** (% per month), and **start date**\n"
            "4. Save — the loan is tracked automatically\n\n"
            "**Manage existing Girvi:**\n"
            "• `/girvi` — view all active loans, interest due, overdue alerts\n"
            "• Click any loan → record interest payment, release pledge\n"
            "• Filter by **overdue** or **closing soon**\n\n"
            "💡 Interest is auto-calculated based on principal and rate."
        )

    # ── Metal Exchange ─────────────────────────────────────────────────────────
    if any(k in msg for k in ("metal exchange", "old gold", "exchange gold", "gold exchange",
                               "silver exchange", "sarafa", "metal swap", "dhatu", "advance metal",
                               "धातु विनिमय", "पुराना सोना", "सराफा", "अग्रिम")):
        return reply(
            "**Metal Exchange:**\n\n"
            "**New Exchange** → `/metal-exchange/new`\n"
            "• Record when a customer gives old gold/silver\n"
            "• Enter weight, purity, type (Gold/Silver), and net amount\n"
            "• Linked to a customer account for balance tracking\n\n"
            "**Advance Balance** → `/metal-exchange/advance`\n"
            "• View how much metal a customer has deposited in advance\n"
            "• Use advance balance to offset future purchase bills\n\n"
            "**Exchange History** → `/metal-exchange` — all past exchanges by customer\n\n"
            "**Metal Rates** → `/metal-exchange/rates` — set today's gold/silver rates"
        )

    # ── Metal Rates ────────────────────────────────────────────────────────────
    if any(k in msg for k in ("metal rate", "gold rate", "silver rate", "set rate", "live rate",
                               "today rate", "rate kaise", "fetch rate", "धातु दर", "सोने का भाव",
                               "चांदी का भाव", "आज का भाव")):
        return reply(
            "**Setting Metal Rates:**\n\n"
            "1. Go to **Metal Rates** → `/metal-exchange/rates`\n"
            "2. Click **Fetch Live Rates** to auto-pull current market prices\n"
            "3. Or manually enter the rate per gram for Gold (22K, 24K) and Silver\n"
            "4. Click **Save Rates** — rates are applied to new bills and exchanges\n\n"
            "💡 Rates are stored with a timestamp so historical transactions always use the rate of that day."
        )

    # ── Orders & Repairs ──────────────────────────────────────────────────────
    if any(k in msg for k in ("order", "repair", "new order", "create order", "job card",
                               "customer order", "jewellery repair", "ऑर्डर", "मरम्मत", "जॉब कार्ड")):
        return reply(
            "**Orders & Repairs:**\n\n"
            "**Create a new Order/Repair:**\n"
            "1. Go to **Orders** → `/orders/new`\n"
            "2. Select the customer, describe the item/work needed\n"
            "3. Set expected delivery date, estimated amount\n"
            "4. Optionally assign to a **Karigar**\n"
            "5. Track status: Pending → In Progress → Ready → Delivered\n\n"
            "**View All Orders** → `/orders` — filter by status, customer, or date\n\n"
            "**Workflow Templates** → `/orders/workflows` — save reusable steps for standard jobs\n\n"
            "💡 Click any order → update status, add notes, record partial payments"
        )

    # ── Karigars ──────────────────────────────────────────────────────────────
    if any(k in msg for k in ("karigar", "artisan", "craftsman", "goldsmith", "worker",
                               "कारीगर", "सुनार", "कारीगर कैसे")):
        return reply(
            "**Karigar Management:**\n\n"
            "1. Go to **Karigars** → `/karigars`\n"
            "2. **Add a karigar**: name, phone, specialisation (setting, polishing, etc.)\n"
            "3. Assign orders to karigars from the Orders module\n"
            "4. Track which jobs each karigar is working on\n"
            "5. Record karigar payments and wages\n\n"
            "💡 Karigars appear in the order detail page so you always know who is doing what."
        )

    # ── Barcode Scanner ───────────────────────────────────────────────────────
    if any(k in msg for k in ("barcode", "scanner", "scan", "qr code", "camera scan",
                               "barcode kaise", "बारकोड", "स्कैनर", "स्कैन")):
        return reply(
            "**Using the Barcode Scanner:**\n\n"
            "1. Go to **Stock** → `/stock`\n"
            "2. Click the **📷 Scan Barcode** button\n"
            "3. Allow camera access when prompted\n"
            "4. Point your camera at the barcode — the item loads automatically\n\n"
            "**Also available in:**\n"
            "• **Create Bill** → scan items to add them to the bill\n"
            "• **Stock In/Out** → scan to record movements quickly\n\n"
            "💡 Works on both mobile and desktop (with webcam). On mobile, use the rear camera for best results."
        )

    # ── Stock Management ───────────────────────────────────────────────────────
    if any(k in msg for k in ("stock", "inventory item", "add stock", "stock item",
                               "stock in", "stock out", "low stock", "minimum stock",
                               "स्टॉक", "सामान")):
        return reply(
            "**Stock Management:**\n\n"
            "**View Stock** → `/stock` — all items with current quantity\n\n"
            "**Add New Stock Item** → `/stock/items/new`\n"
            "• Enter item name, SKU/barcode, category, unit price, minimum stock level\n\n"
            "**Stock In / Out** → `/stock/movements`\n"
            "• Record purchases (stock in) and usage (stock out)\n"
            "• Use the 📷 **Barcode Scanner** to scan items instantly\n\n"
            "**Low Stock Alerts** → `/stock/low-stock`\n"
            "• See all items below their minimum quantity threshold\n\n"
            "💡 Set minimum stock levels so you get alerts before running out."
        )

    # ── Serialized Pieces / Inventory ─────────────────────────────────────────
    if any(k in msg for k in ("piece", "serialized", "serial number", "inventory piece",
                               "jewellery piece", "tag piece", "lifecycle", "sold piece",
                               "आभूषण", "सीरियल नंबर", "टैग")):
        return reply(
            "**Serialized Jewellery Pieces:**\n\n"
            "Each piece gets a unique serial number and full lifecycle tracking.\n\n"
            "**View all pieces** → `/inventory/pieces`\n"
            "**Add a piece**:\n"
            "1. Click **Add Piece** → enter serial number, metal type, weight, purity, category\n"
            "2. Attach a photo and set current status (In Stock / Sold / Repaired / With Karigar)\n"
            "3. Each status change is logged in the piece history\n\n"
            "💡 Useful for high-value pieces you want to track individually, like branded or custom jewellery."
        )

    # ── WhatsApp Reminders ────────────────────────────────────────────────────
    if any(k in msg for k in ("whatsapp", "reminder", "sms", "send message", "notification",
                               "due reminder", "payment reminder", "remind customer",
                               "व्हाट्सएप", "रिमाइंडर", "संदेश भेजें")):
        return reply(
            "**WhatsApp Payment Reminders:**\n\n"
            "1. Go to **Reminders** → `/reminders`\n"
            "2. See all customers with **outstanding dues**\n"
            "3. Click **Send WhatsApp** next to any customer\n"
            "4. A pre-filled message with their outstanding amount opens in WhatsApp\n\n"
            "**Push Notifications** → sent automatically for payment confirmations and order updates\n\n"
            "💡 The message includes the customer's name, total due, and a friendly payment request — in their preferred language."
        )

    # ── GST Reports ───────────────────────────────────────────────────────────
    if any(k in msg for k in ("gst", "tax", "gst report", "b2b", "b2c", "hsn", "tax report",
                               "जीएसटी", "कर", "जीएसटी रिपोर्ट")):
        return reply(
            "**GST Reports:**\n\n"
            "1. Go to **GST Reports** → `/gst-reports`\n"
            "2. Select the **month and year**\n"
            "3. View **B2B** (registered buyers) and **B2C** (individual buyers) breakdowns\n"
            "4. See **HSN-wise** summary for GSTR-1 filing\n"
            "5. **Download** as Excel/CSV for your CA or filing software\n\n"
            "💡 GST is applied automatically on bills when you set the rate while creating a bill."
        )

    # ── Barcode Scanner ───────────────────────────────────────────────────────
    if any(k in msg for k in ("barcode", "scanner", "scan", "qr code", "camera scan",
                               "barcode kaise", "बारकोड", "स्कैनर", "स्कैन")):
        return reply(
            "**Using the Barcode Scanner:**\n\n"
            "1. Go to **Stock** → `/stock`\n"
            "2. Click the **📷 Scan Barcode** button\n"
            "3. Allow camera access when prompted\n"
            "4. Point your camera at the barcode — the item loads automatically\n\n"
            "**Also available in:**\n"
            "• **Create Bill** → scan items to add them to the bill\n"
            "• **Stock In/Out** → scan to record movements quickly\n\n"
            "💡 Works on both mobile and desktop (with webcam). On mobile, use the rear camera for best results."
        )

    # ── Staff / Workers / Roles ───────────────────────────────────────────────
    if any(k in msg for k in ("staff", "worker", "employee", "add staff", "user role",
                               "manager", "permission", "access control", "role",
                               "कर्मचारी", "स्टाफ", "भूमिका", "अनुमति")):
        return reply(
            "**Staff & Role Management:**\n\n"
            "**Add Staff** → `/workers`\n"
            "1. Click **Add Worker** → enter name, phone, email, designation\n"
            "2. Assign role: **Manager** (most access) or **Staff** (limited access)\n\n"
            "**Role Permissions:**\n"
            "• **Admin** — full access to all features + settings\n"
            "• **Manager** — all shop features, no billing/plan settings\n"
            "• **Staff** — day-to-day tasks (bills, customers, orders)\n"
            "• **Customer** — read-only customer portal access\n\n"
            "💡 Staff can only see data for their own store. Admins see everything."
        )

    # ── Subscription / Plan / Trial ───────────────────────────────────────────
    if any(k in msg for k in ("subscription", "plan", "billing plan", "upgrade", "trial",
                               "pricing", "free trial", "enterprise",
                               "सदस्यता", "प्लान", "ट्रायल", "अपग्रेड")):
        return reply(
            "**Subscription & Plans:**\n\n"
            "• **Starter** — basic features for small shops\n"
            "• **Pro** — full features including AI review, advanced reports\n"
            "• **Enterprise** — unlimited stores, priority support\n"
            "• **14-day free trial** — all Pro features unlocked, no card required\n\n"
            "View or change your plan → `/billing`\n\n"
            "💡 Your trial started when you registered. After it ends, your data is safe — you just need to pick a plan to continue."
        )

    # ── Login / Password / Account ────────────────────────────────────────────
    if any(k in msg for k in ("login", "logout", "password", "forgot password", "sign in",
                               "sign out", "account", "change password", "reset password",
                               "लॉगिन", "पासवर्ड", "लॉगआउट")):
        return reply(
            "**Account & Login:**\n\n"
            "• **Login** → `/login` with your email and password\n"
            "• **Forgot Password** → click *Forgot password?* on the login page\n"
            "• **Logout** → click the **Logout** button at the bottom of the sidebar\n"
            "• **2-Factor Authentication** → enable in your account settings for extra security\n\n"
            "💡 If you see a login error, make sure Caps Lock is off and you're using the correct email."
        )

    # ── Dashboard / Analytics ─────────────────────────────────────────────────
    if any(k in msg for k in ("dashboard", "analytics", "chart", "report", "insight",
                               "daily report", "weekly report", "monthly report",
                               "डैशबोर्ड", "रिपोर्ट", "चार्ट", "इनसाइट")):
        return reply(
            "**Dashboard & Analytics:**\n\n"
            "• **Main Dashboard** → `/home` — KPI cards: bills, revenue, outstanding, open orders\n"
            "• **AI Business Review** → `/jewellery-business` — AI-powered 3/6/12 month forecast\n"
            "• **Insights** → `/insights` — sales trends, top customers, best-selling items\n"
            "• **Activity History** → `/activity-history` — full audit log of who did what\n\n"
            "💡 The dashboard updates in real-time as you create bills, record payments, and update orders."
        )

    # ── Customer Portal ───────────────────────────────────────────────────────
    if any(k in msg for k in ("customer portal", "customer login", "self service", "portal",
                               "customer account", "ग्राहक पोर्टल", "पोर्टल")):
        return reply(
            "**Customer Portal:**\n\n"
            "Customers can log in at `/customer/login` to:\n"
            "• View their own **purchase history** and invoices\n"
            "• Check their **outstanding balance**\n"
            "• See their **girvi loans** and interest due\n"
            "• Download **PDF invoices**\n\n"
            "**To invite a customer:**\n"
            "1. Open their profile → click **Send Invite**\n"
            "2. They receive an email/WhatsApp with a login link\n"
            "3. They set their password and access their portal\n\n"
            "💡 Customers only see their own data — completely private."
        )

    # ── Onboarding / Setup ────────────────────────────────────────────────────
    if any(k in msg for k in ("setup", "onboarding", "getting started", "first time",
                               "configure", "initial setup", "how to start", "new shop",
                               "शुरुआत", "सेटअप", "कैसे शुरू")):
        return reply(
            "**Getting Started with Jewellery Manager:**\n\n"
            "**Step 1:** Add your shop details → `/onboarding`\n"
            "**Step 2:** Set up metal rates → `/metal-exchange/rates`\n"
            "**Step 3:** Add your first customer → `/addCustomer`\n"
            "**Step 4:** Create your first bill → `/buyProduct`\n"
            "**Step 5:** Add staff members → `/workers`\n\n"
            "🎯 **Quick links to get going:**\n"
            "• Add customers: `/addCustomer`\n"
            "• Create a bill: `/buyProduct`\n"
            "• View dashboard: `/home`"
        )

    # ── Help / What can you do ─────────────────────────────────────────────────
    if any(k in msg for k in ("help", "what can you do", "what do you know", "guide me",
                               "features", "what is this", "explain", "tell me about",
                               "मदद", "क्या कर सकते हो", "बताओ", "समझाओ")):
        return reply(
            "**I can help you with:**\n\n"
            "📦 **Product Help:** Ask me how to use any feature\n"
            "• *\"How do I add a girvi loan?\"*\n"
            "• *\"How does the barcode scanner work?\"*\n"
            "• *\"How to send WhatsApp reminders?\"*\n\n"
            "📊 **Business Insights:** Ask about your live data\n"
            "• *\"How are my sales this month?\"*\n"
            "• *\"How many active customers do I have?\"*\n"
            "• *\"What is my outstanding balance?\"*\n\n"
            "🔧 **Setup & Config:** Ask about settings\n"
            "• *\"How do I add staff?\"*\n"
            "• *\"How to set today's gold rate?\"*\n"
            "• *\"How does the customer portal work?\"*"
        )

    # ── Generic fallback ───────────────────────────────────────────────────────
    return {
        "reply": (
            "I'm not sure I understood that. Let me suggest some things I can help with:\n\n"
            "• **Sales & dues** — *\"How are my sales this month?\"*\n"
            "• **Add girvi loan** — *\"How do I create a girvi?\"*\n"
            "• **Barcode scanner** — *\"How does the scanner work?\"*\n"
            "• **Reminders** — *\"How to send WhatsApp reminders?\"*\n"
            "• **Bills** — *\"How to create a bill?\"*\n"
            "• **Karigar** — *\"How to assign a repair to a karigar?\"*\n\n"
            "You can also add an `OPENAI_API_KEY` to your backend `.env` for full AI-powered answers."
            + (f"\n\n_(AI unavailable: {error[:80]})_" if error else "")
        ),
        "source": "rule_based",
    }
