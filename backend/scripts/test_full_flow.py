#!/usr/bin/env python3
"""
Full Integration Test Suite — Customer Management System
Run: TEST_EMAIL=testadmin@autotest.com TEST_PASS=TestPass@123 python scripts/test_full_flow.py
"""
import os, json, random, time
import urllib.request, urllib.error
from datetime import date, datetime, timedelta

BASE = "http://localhost:8000"
EMAIL = os.environ.get("TEST_EMAIL", "testadmin@autotest.com")
PASSWORD = os.environ.get("TEST_PASS", "TestPass@123")
PASS = FAIL = WARN = 0
RESULTS = []

def _color(c, s):
    codes = {"green":"\033[92m","red":"\033[91m","yellow":"\033[93m","cyan":"\033[96m","bold":"\033[1m","reset":"\033[0m"}
    return f"{codes.get(c,'')}{s}{codes['reset']}"

def check(label, condition, got=None, warn_only=False):
    global PASS, FAIL, WARN
    if condition: PASS += 1; sym, col = "PASS", "green"
    elif warn_only: WARN += 1; sym, col = "WARN", "yellow"
    else: FAIL += 1; sym, col = "FAIL", "red"
    extra = f"  (got: {str(got)[:120]})" if got is not None and not condition else ""
    RESULTS.append((sym, label, extra))
    icon = "✅" if sym == "PASS" else ("⚠️ " if sym == "WARN" else "❌")
    print(f"  {icon} {_color(col, sym)}  {label}{extra}")

def req(method, path, token=None, body=None):
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if token: headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            try: result = json.loads(resp.read())
            except Exception: result = {}
            return resp.status, result
    except urllib.error.HTTPError as e:
        try: result = json.loads(e.read())
        except Exception: result = {}
        return e.code, result
    except Exception as e:
        return 0, {"_error": str(e)}

def section(name):
    print(f"\n{_color('bold', _color('cyan', '═══ ' + name + ' ═══'))}")

# Unique suffix for this test run (avoids phone/name collisions across runs)
RUN_ID = str(int(time.time()))[-6:]

# ── S0: Health ───────────────────────────────────────────────────────────────
section("SECTION 0 — Health Check")
s, d = req("GET", "/health")
check("Health endpoint returns 200", s == 200, got=s)
check("DB connected", d.get("db") == "connected", got=d.get("db"))

# ── S1: Auth ─────────────────────────────────────────────────────────────────
section("SECTION 1 — Authentication")
s, d = req("POST", "/api/auth/login", body={"email": EMAIL, "password": PASSWORD})
check("Valid login → 200", s == 200, got=s)
TOKEN = d.get("token") or d.get("access_token", "")
check("Token present", bool(TOKEN), got=str(TOKEN)[:30])
s, d = req("POST", "/api/auth/login", body={"email": EMAIL, "password": "wrongpassword"})
check("Wrong password → 401", s == 401, got=s)
s, d = req("GET", "/api/customer/all")
check("No token → 401", s == 401, got=s)
s, d = req("GET", "/api/customer/all", token="bad.token.here")
check("Malformed JWT → 401", s == 401, got=s)

# ── S2: Metal Rates ──────────────────────────────────────────────────────────
section("SECTION 2 — Metal Rates")
s, d = req("GET", "/api/metal-rates/current", token=TOKEN)
check("GET /metal-rates/current → 200", s == 200, got=s)
s, d = req("POST", "/api/metal-rates", token=TOKEN, body={
    "metal_type": "Gold", "rate_per_unit": 6500.0, "unit": "gram"
})
check("POST metal rate → 200/201", s in (200, 201), got=s)

# ── S3: 50 Customers ─────────────────────────────────────────────────────────
section("SECTION 3 — 50 Customers")
CUSTOMER_IDS = []
CUSTOMER_DATA = []
# Generate 50 unique phone numbers for this run
phones = set()
while len(phones) < 52:
    phones.add(str(random.randint(7100000000, 7999000000)))
phone_list = list(phones)[:50]
dup_phone = phone_list[0]

for i, phone in enumerate(phone_list):
    name = f"AutoTest {RUN_ID} Cust {i+1:02d}"
    s, d = req("POST", "/api/customer/add", token=TOKEN, body={
        "name": name, "primary_phone": phone,
        "email": f"auto{RUN_ID}{i+1}@test.com",
        "city": "Mumbai", "state": "Maharashtra",
    })
    if s in (200, 201):
        cid = d.get("id") or (d.get("data") or {}).get("id")
        if cid:
            CUSTOMER_IDS.append(cid)
            CUSTOMER_DATA.append({"id": cid, "name": name, "phone": phone})

check(f"Created 50 customers (got {len(CUSTOMER_IDS)})", len(CUSTOMER_IDS) == 50, got=len(CUSTOMER_IDS))

# Duplicate phone
s, d = req("POST", "/api/customer/add", token=TOKEN, body={
    "name": "Dup Test", "primary_phone": dup_phone
})
check("Duplicate phone → 4xx", s >= 400, got=s)

# Missing required field
s, d = req("POST", "/api/customer/add", token=TOKEN, body={"primary_phone": "9999999991"})
check("Missing name → 422", s == 422, got=s)

if CUSTOMER_DATA:
    s, d = req("GET", f"/api/customer/search?q={CUSTOMER_DATA[0]['phone']}", token=TOKEN)
    check("Search by phone → 200", s == 200, got=s)

if CUSTOMER_IDS:
    s, d = req("GET", f"/api/customer/{CUSTOMER_IDS[0]}", token=TOKEN)
    check("Get customer by ID → 200", s == 200, got=s)
    s, d = req("PUT", f"/api/customer/update/{CUSTOMER_IDS[0]}", token=TOKEN,
               body={"name": CUSTOMER_DATA[0]["name"], "primary_phone": CUSTOMER_DATA[0]["phone"], "city": "Pune", "notes": "Updated"})
    check("Update customer → 200", s == 200, got=s)

s, d = req("GET", "/api/customer/9999999", token=TOKEN)
check("Non-existent customer → 404", s == 404, got=s)
s, d = req("GET", "/api/customer/all", token=TOKEN)
check("List all customers → 200", s == 200 and isinstance(d, list), got=s)

# ── S4: Transactions / Billing ───────────────────────────────────────────────
section("SECTION 4 — Transactions / Billing")
TRANSACTION_IDS = []
bill_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

for i in range(min(10, len(CUSTOMER_DATA))):
    c = CUSTOMER_DATA[i]
    grand = round(32500.0 + i * 100, 2)
    paid = round(grand / 2, 2)
    due = round(grand - paid, 2)
    s, d = req("POST", "/api/transactions/add", token=TOKEN, body={
        "customerId": c["id"], "customerName": c["name"],
        "products": [{"productName": "Gold Ring", "metalType": "Gold",
                      "weight": 5.0, "rate": 6500.0, "makingCharge": 300.0,
                      "diamondCharge": 0.0, "metalValue": 32500.0,
                      "total": grand, "qty": 1.0}],
        "grandTotal": grand, "paidAmount": paid, "dueAmount": due,
        "date": bill_date, "billType": "sale",
    })
    if s in (200, 201):
        tid = d.get("transactionId") or d.get("id") or (d.get("data") or {}).get("id")
        if tid: TRANSACTION_IDS.append(tid)

check(f"Created 10 bills (got {len(TRANSACTION_IDS)})", len(TRANSACTION_IDS) == 10, got=len(TRANSACTION_IDS))

if TRANSACTION_IDS:
    s, d = req("GET", f"/api/transactions/invoice/{TRANSACTION_IDS[0]}", token=TOKEN)
    check("Get invoice → 200", s == 200, got=s)

if CUSTOMER_IDS:
    s, d = req("GET", f"/api/transactions/{CUSTOMER_IDS[0]}", token=TOKEN)
    check("Transactions by customer → 200", s == 200, got=s)

if TRANSACTION_IDS:
    s, d = req("POST", f"/api/transactions/{TRANSACTION_IDS[0]}/record-payment", token=TOKEN,
               body={"amount": 1000.0, "payment_mode": "Cash", "notes": "Partial test"})
    check("Record partial payment → 200", s == 200, got=s)

# ── S5: Girvi Loans ──────────────────────────────────────────────────────────
section("SECTION 5 — Girvi Loans")
GIRVI_IDS = []
girvi_date = date.today().isoformat()

for i in range(min(5, len(CUSTOMER_IDS))):
    s, d = req("POST", "/api/girvi", token=TOKEN, body={
        "customer_id": CUSTOMER_IDS[i],
        "jewelry_description": f"Gold necklace set with intricate design #{i+1}",
        "gross_weight": 20.5, "purity": 0.916,
        "principal_amount": 50000.0 + i * 5000,
        "interest_rate_per_month": 2.0,
        "start_date": girvi_date, "notes": f"Test loan #{i+1}",
    })
    if s in (200, 201):
        gid = d.get("id") or (d.get("data") or {}).get("id")
        if gid: GIRVI_IDS.append(gid)

check(f"Created 5 girvi loans (got {len(GIRVI_IDS)})", len(GIRVI_IDS) == 5, got=len(GIRVI_IDS))
s, d = req("GET", "/api/girvi", token=TOKEN)
check("List girvi loans → 200", s == 200, got=s)

if GIRVI_IDS:
    s, d = req("GET", f"/api/girvi/{GIRVI_IDS[0]}", token=TOKEN)
    check("Get single girvi → 200", s == 200, got=s)
    s, d = req("GET", f"/api/girvi/interest-due?loan_id={GIRVI_IDS[0]}", token=TOKEN)
    check("Girvi interest-due → 200", s == 200, got=s)
    s, d = req("POST", f"/api/girvi/{GIRVI_IDS[0]}/interest", token=TOKEN,
               body={"amount": 1000.0, "notes": "Test interest payment"})
    check("Girvi interest payment → 200/201", s in (200, 201), got=s)
    s, d = req("POST", f"/api/girvi/{GIRVI_IDS[0]}/close", token=TOKEN,
               body={"settlement_amount": 51000.0, "close_date": girvi_date})
    check("Close girvi loan → 200", s == 200, got=s)

s, d = req("GET", "/api/girvi/9999999", token=TOKEN)
check("Non-existent girvi → 404", s == 404, got=s)
s, d = req("POST", "/api/girvi", token=TOKEN, body={
    "customer_id": 9999999, "jewelry_description": "Gold chain with pendant design",
    "principal_amount": 50000.0, "interest_rate_per_month": 2.0, "start_date": girvi_date,
})
check("Girvi invalid customer → 4xx", s >= 400, got=s)

# ── S6: Metal Exchange ───────────────────────────────────────────────────────
section("SECTION 6 — Metal Exchange")
EXCHANGE_IDS = []
EXCHANGE_TYPES = ["raw_to_pure", "raw_to_cash", "advance_metal", "advance_money", "raw_to_pure"]

for i in range(min(5, len(CUSTOMER_IDS))):
    s, d = req("POST", "/api/metal-exchange", token=TOKEN, body={
        "customer_id": CUSTOMER_IDS[i], "type": EXCHANGE_TYPES[i],
        "metal_type": "Gold", "raw_weight": 10.5 + i, "raw_purity": 0.916,
        "pure_weight": 9.62 + i, "cash_amount": 62000.0 + i * 1000,
        "rate_per_gram": 6500.0, "notes": f"Exchange #{i+1}",
    })
    if s in (200, 201):
        eid = d.get("id") or (d.get("data") or {}).get("id")
        if eid: EXCHANGE_IDS.append(eid)

check(f"Created 5 metal exchanges (got {len(EXCHANGE_IDS)})", len(EXCHANGE_IDS) == 5, got=len(EXCHANGE_IDS))
s, d = req("GET", "/api/metal-exchange", token=TOKEN)
check("List metal exchanges → 200", s == 200, got=s)
if CUSTOMER_IDS:
    s, d = req("GET", f"/api/metal-exchange/advance-balance?customer_id={CUSTOMER_IDS[0]}", token=TOKEN)
    check("Metal exchange advance-balance → 200", s == 200, got=s)
if EXCHANGE_IDS:
    s, d = req("GET", f"/api/metal-exchange/{EXCHANGE_IDS[0]}", token=TOKEN)
    check("Get single exchange → 200", s == 200, got=s)

# ── S7: Karigars ─────────────────────────────────────────────────────────────
section("SECTION 7 — Karigars")
KARIGAR_IDS = []
for i in range(3):
    s, d = req("POST", "/api/karigars", token=TOKEN, body={
        "name": f"AutoKarigar {RUN_ID} {i+1}",
        "phone": f"8{RUN_ID[:6]}{i}",
        "specialty": "Gold", "rate_per_gram": 80 + i * 10,
    })
    if s in (200, 201):
        kid = d.get("id") or (d.get("data") or {}).get("id")
        if kid: KARIGAR_IDS.append(kid)

check(f"Created 3 karigars (got {len(KARIGAR_IDS)})", len(KARIGAR_IDS) == 3, got=len(KARIGAR_IDS))
s, d = req("GET", "/api/karigars", token=TOKEN)
check("List karigars → 200", s == 200, got=s)
if KARIGAR_IDS:
    s, d = req("PATCH", f"/api/karigars/{KARIGAR_IDS[0]}", token=TOKEN, body={"rate_per_gram": 95})
    check("Update karigar → 200", s == 200, got=s)

# ── S8: Orders / Repairs ─────────────────────────────────────────────────────
section("SECTION 8 — Orders / Repairs")
ORDER_IDS = []
expected_date = (date.today() + timedelta(days=10)).isoformat()

for i in range(min(5, len(CUSTOMER_IDS))):
    body = {
        "customer_id": CUSTOMER_IDS[i],
        "type": "repair",
        "description": f"Ring resize + polish order #{i+1}",
        "estimated_delivery": expected_date,
        "advance_paid": 500.0 * (i + 1),
        "total_estimate": 2000.0 + i * 200,
        "metal_type": "Gold",
        "item_description": "22K gold ring",
    }
    if KARIGAR_IDS: body["karigar_id"] = KARIGAR_IDS[0]
    s, d = req("POST", "/api/orders", token=TOKEN, body=body)
    if s in (200, 201):
        oid = d.get("id") or (d.get("data") or {}).get("id")
        if oid: ORDER_IDS.append(oid)

check(f"Created 5 orders (got {len(ORDER_IDS)})", len(ORDER_IDS) == 5, got=len(ORDER_IDS))
s, d = req("GET", "/api/orders", token=TOKEN)
check("List orders → 200", s == 200, got=s)

if ORDER_IDS:
    s, d = req("GET", f"/api/orders/{ORDER_IDS[0]}", token=TOKEN)
    check("Get single order → 200", s == 200, got=s)
    for status_val in ["in_progress", "ready", "delivered"]:
        s, d = req("PATCH", f"/api/orders/{ORDER_IDS[0]}", token=TOKEN, body={"status": status_val})
        check(f"Order status → {status_val} (200)", s == 200, got=s)

s, d = req("GET", "/api/orders/9999999", token=TOKEN)
check("Non-existent order → 404", s == 404, got=s)

# ── S9: Stock / Inventory ────────────────────────────────────────────────────
section("SECTION 9 — Stock / Inventory")
s, d = req("POST", "/api/stock/categories", token=TOKEN, body={
    "name": f"AutoTest Rings {RUN_ID}", "description": "Test category", "metal_type": "Gold"
})
check("Create stock category → 200/201", s in (200, 201), got=s)
cat_id = d.get("id") or (d.get("data") or {}).get("id")

STOCK_IDS = []
for i in range(5):
    s, d = req("POST", "/api/stock/items", token=TOKEN, body={
        "name": f"Ring {RUN_ID} #{i+1}", "unit": "piece",
        "unit_price": 5000.0 + i * 500, "min_quantity": 2.0,
        "category_id": cat_id, "metal_type": "Gold",
        "purity_percent": 91.6, "gross_weight_g": 5.0 + i, "net_weight_g": 4.8 + i,
    })
    if s in (200, 201):
        sid = d.get("id") or (d.get("data") or {}).get("id")
        if sid: STOCK_IDS.append(sid)

check(f"Created 5 stock items (got {len(STOCK_IDS)})", len(STOCK_IDS) == 5, got=len(STOCK_IDS))

if STOCK_IDS:
    s, d = req("POST", "/api/stock/movements", token=TOKEN, body={
        "item_id": STOCK_IDS[0], "movement_type": "IN", "quantity": 10.0, "notes": "Stock IN"
    })
    check("Stock movement IN → 200/201", s in (200, 201), got=s)
    s, d = req("POST", "/api/stock/movements", token=TOKEN, body={
        "item_id": STOCK_IDS[0], "movement_type": "OUT", "quantity": 3.0, "notes": "Stock OUT"
    })
    check("Stock movement OUT → 200/201", s in (200, 201), got=s)
    s, d = req("GET", "/api/stock/low-stock", token=TOKEN)
    check("Low stock list → 200", s == 200, got=s)
    s, d = req("GET", "/api/stock/dashboard", token=TOKEN)
    check("Stock dashboard → 200", s == 200, got=s)
    s, d = req("PATCH", f"/api/stock/items/{STOCK_IDS[0]}", token=TOKEN,
               body={"description": "Updated description"})
    check("Update stock item → 200", s == 200, got=s)

# ── S10: Payments ────────────────────────────────────────────────────────────
section("SECTION 10 — Payments")
s, d = req("GET", "/api/payments/outstanding", token=TOKEN)
check("Payments outstanding → 200", s == 200, got=s)
s, d = req("GET", "/api/payments/history", token=TOKEN)
check("Payments history → 200", s == 200, got=s)

# ── S11: Dashboard & Analytics ───────────────────────────────────────────────
section("SECTION 11 — Dashboard & Analytics")
s, d = req("GET", "/api/dashboard", token=TOKEN)
check("Dashboard → 200", s == 200, got=s)
s, d = req("GET", "/api/analytics/summary", token=TOKEN)
check("Analytics → 200", s == 200, got=s)
s, d = req("GET", "/api/insights", token=TOKEN)
check("Insights → 200", s == 200, got=s)

# ── S12: AI Chat ─────────────────────────────────────────────────────────────
section("SECTION 12 — AI Chat")
for q in [
    "What is my total revenue this month?",
    "List top customers",
    "How do I create a new bill?",
    "Show pending payments",
    "Gold rate today",
    "How to add a girvi loan?",
    "hello",
    "What are my pending orders?",
]:
    s, d = req("POST", "/api/ai/chat", token=TOKEN, body={"message": q})
    got_reply = bool(d.get("reply") or d.get("response") or d.get("message"))
    check(f"AI: '{q[:38]}' → reply", s == 200 and got_reply, got=s)

# ── S13: Reminders ───────────────────────────────────────────────────────────
section("SECTION 13 — Reminders")
s, d = req("GET", "/api/reminders/outstanding-summary", token=TOKEN)
check("Reminders outstanding-summary → 200", s == 200, got=s)

# ── S14: Activity History ────────────────────────────────────────────────────
section("SECTION 14 — Activity History")
s, d = req("GET", "/api/history", token=TOKEN)
check("Activity history → 200", s == 200, got=s)

# ── S15: GST Reports ─────────────────────────────────────────────────────────
section("SECTION 15 — GST Reports")
s, d = req("GET", "/api/gst/settings", token=TOKEN)
check("GST settings → 200", s == 200, got=s)
s, d = req("GET", f"/api/gst/gstr1?year={date.today().year}&month={date.today().month}", token=TOKEN)
check("GST GSTR1 report → 200", s == 200, got=s)

# ── S16: RBAC / Security ─────────────────────────────────────────────────────
section("SECTION 16 — RBAC / Security")
s, d = req("GET", "/api/admin/stores", token=TOKEN)
check("Admin → /admin/stores → 403", s == 403, got=s)
s, d = req("GET", "/api/customer/search?q=%27%20OR%201%3D1%20--", token=TOKEN)
check("SQL injection → handled safely", s in (200, 400, 422), got=s)
s, d = req("POST", "/api/customer/add", token=TOKEN,
           body={"name": "A" * 1001, "primary_phone": "9876543210"})
check("Excessively long name → not 500", s != 500, got=s)

# ── S17: Store Info ──────────────────────────────────────────────────────────
section("SECTION 17 — Store Info")
s, d = req("GET", "/api/stores/me", token=TOKEN)
check("Store /me → 200", s == 200, got=s)

# ── S18: Edge Cases ──────────────────────────────────────────────────────────
section("SECTION 18 — Edge Cases")
future = (date.today() + timedelta(days=5)).isoformat()
if CUSTOMER_IDS:
    s, d = req("POST", "/api/girvi", token=TOKEN, body={
        "customer_id": CUSTOMER_IDS[0],
        "jewelry_description": "Gold bracelet with intricate design",
        "principal_amount": 50000.0, "interest_rate_per_month": 2.0, "start_date": future,
    })
    check("Future girvi start_date → 422", s == 422, got=s)

if CUSTOMER_IDS and CUSTOMER_DATA:
    s, d = req("PUT", f"/api/customer/update/{CUSTOMER_IDS[-1]}", token=TOKEN,
               body={"name": CUSTOMER_DATA[-1]["name"], "primary_phone": CUSTOMER_DATA[-1]["phone"], "is_active": False})
    check("Deactivate customer via PUT → 200", s == 200, got=s)
    s, d = req("DELETE", f"/api/customer/delete/{CUSTOMER_IDS[-1]}", token=TOKEN)
    check("Delete customer → 200/204", s in (200, 204), got=s)

# ── FINAL REPORT ─────────────────────────────────────────────────────────────
print(f"\n{'═'*65}")
print(_color("bold", "FINAL TEST REPORT"))
print(f"{'═'*65}")
total = PASS + FAIL + WARN
print(f"\n  Total:  {total}")
print(f"  {_color('green', 'PASS:  ' + str(PASS))}")
print(f"  {_color('yellow', 'WARN:  ' + str(WARN))}")
print(f"  {_color('red', 'FAIL:  ' + str(FAIL))}")
score = int(100 * PASS / total) if total else 0
print(f"\n  Score:  {score}%  {'��' if score >= 90 else '✅' if score >= 75 else '⚠️' if score >= 50 else '❌'}")

if FAIL:
    print(f"\n{_color('red', 'FAILED CHECKS:')}")
    for sym, label, extra in RESULTS:
        if sym == "FAIL": print(f"  ❌ {label}{extra}")

if WARN:
    print(f"\n{_color('yellow', 'WARNINGS:')}")
    for sym, label, extra in RESULTS:
        if sym == "WARN": print(f"  ⚠️  {label}{extra}")
print()
