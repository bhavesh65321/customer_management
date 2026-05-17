import requests, time, sys

BASE = "http://localhost:8000"
PASS = 0; FAIL = 0; BUGS = []

def login(email, pw):
    r = requests.post(f"{BASE}/api/auth/login", json={"email":email,"password":pw}, timeout=5)
    return r.json().get("token") if r.status_code == 200 else None

def H(tok): return {"Authorization":f"Bearer {tok}"}
def hit(method, path, hdr, body=None, params=None):
    return requests.request(method, BASE+path, headers=hdr, json=body, params=params, timeout=8)

def chk(label, resp, exp_status, check_fn=None, scenario=""):
    global PASS, FAIL
    ok = resp.status_code == exp_status
    if ok and check_fn:
        try: ok = bool(check_fn(resp.json()))
        except: ok = False
    icon = "✅" if ok else "❌"
    if ok: PASS += 1
    else:
        FAIL += 1
        BUGS.append({"scenario":scenario,"test":label,"got":resp.status_code,"expected":exp_status,"body":resp.text[:200]})
    print(f"  {icon} [{resp.status_code}] {label}")
    return ok

# ── SETUP ──────────────────────────────────────────────────────────────────
admin_tok = login("test1@gmail.com","Admin@1234")
print(f"Admin login: {'✅' if admin_tok else '❌ FATAL'}")
if not admin_tok: sys.exit(1)
Ha = H(admin_tok)

sw = hit("POST","/api/workers",Ha,{"email":"e2e_staff_run@test.com","password":"Staff@1234","role":"staff","name":"E2E Staff"})
staff_tok = login("e2e_staff_run@test.com","Staff@1234")
Hs = H(staff_tok) if staff_tok else {}
staff_id = sw.json().get("id") if sw.status_code in(200,201) else None
print(f"Staff login: {'✅' if staff_tok else '⚠️  unavail'}\n")

print("╔══════════════════════════════════════════════════════════════╗")
print("║     10-SCENARIO E2E AUDIT — FINAL RUN WITH ALL FIXES        ║")
print("╚══════════════════════════════════════════════════════════════╝")

# ══════ S1: RBAC ════════════════════════════════════════════════════════════
S="S1-RBAC"
print(f"\n─── {S}: Auth Boundaries ───")
for path in ["/api/dashboard","/api/workers","/api/girvi","/api/payments/outstanding","/api/orders"]:
    chk(f"Unauth → {path}", requests.get(BASE+path,timeout=5), 401, scenario=S)
if Hs:
    chk("Staff cannot POST /api/workers → 403",
        hit("POST","/api/workers",Hs,{"email":"bad@bad.com","password":"P@ss1","role":"staff","name":"Bad"}),403,scenario=S)
    if staff_id:
        chk("Staff cannot DELETE worker → 403",
            hit("DELETE",f"/api/workers/{staff_id}",Hs),403,scenario=S)
if staff_id:
    chk("Admin DELETE worker → 204",
        hit("DELETE",f"/api/workers/{staff_id}",Ha),204,scenario=S)

# ══════ S2: Customer Lifecycle ══════════════════════════════════════════════
S="S2-Customer"
print(f"\n─── {S}: Lifecycle ───")
ts = int(time.time())%99999999
phone = f"70{ts:08d}"
cust = {"name":f"E2E Kumar {ts}","primary_phone":phone,"city":"Jaipur","gender":"M","email":f"e2e{ts}@test.com"}
r = hit("POST","/api/customer/add",Ha,cust)
chk("Create customer → 201", r, 201, scenario=S)
cid = r.json().get("id") if r.status_code==201 else None
if cid:
    chk("GET by ID", hit("GET",f"/api/customer/{cid}",Ha), 200, lambda d:d.get("id")==cid, S)
    chk("Search by name", hit("GET","/api/customer/search",Ha,params={"q":f"E2E Kumar {ts}"}),
        200, lambda d:isinstance(d,list) and any(c["id"]==cid for c in d), S)
    chk("Update city to Mumbai",
        hit("PUT",f"/api/customer/update/{cid}",Ha,{**cust,"city":"Mumbai"}),
        200, lambda d:d.get("city")=="Mumbai", S)
    chk("City persisted", hit("GET",f"/api/customer/{cid}",Ha), 200, lambda d:d.get("city")=="Mumbai", S)
    chk("Duplicate phone → 400",
        hit("POST","/api/customer/add",Ha,{**cust,"name":"Dup"}), 400, scenario=S)

# ══════ S3: Girvi ═══════════════════════════════════════════════════════════
S="S3-Girvi"
print(f"\n─── {S}: Pawn Loan Full Flow ───")
loan_id=None
if cid:
    r = hit("POST","/api/girvi",Ha,{
        "customer_id":cid,"jewelry_description":"Gold Ring 22K",
        "gross_weight":10.0,"purity":22,"principal_amount":40000,
        "interest_rate_per_month":1.5,"start_date":"2026-04-01"
    })
    chk("Create girvi → 201", r, 201, scenario=S)
    loan_id = r.json().get("id") if r.status_code==201 else None
if loan_id:
    r = hit("GET",f"/api/girvi/{loan_id}",Ha)
    chk("GET loan — status=active", r, 200, lambda d:d.get("status")=="active", S)
    chk("Has interest_payments list", r, 200, lambda d:"interest_payments" in d, S)
    chk("Has total_interest_paid", r, 200, lambda d:"total_interest_paid" in d, S)
    chk("Interest payment 1", hit("POST",f"/api/girvi/{loan_id}/interest",Ha,{"amount":600,"notes":"Apr"}), 200, scenario=S)
    chk("Interest payment 2", hit("POST",f"/api/girvi/{loan_id}/interest",Ha,{"amount":600,"notes":"May"}), 200, scenario=S)
    r = hit("GET",f"/api/girvi/{loan_id}",Ha)
    chk("total_interest_paid ≥ 1200", r, 200, lambda d:float(d.get("total_interest_paid",0))>=1200, S)
    r = hit("POST",f"/api/girvi/{loan_id}/close",Ha)
    chk("Close → returns status=closed", r, 200, lambda d:d.get("status")=="closed", S)
    chk("Closed loan not in active list",
        hit("GET","/api/girvi",Ha,params={"status":"active"}),
        200, lambda d:all(x.get("id")!=loan_id for x in d), S)

# ══════ S4: Metal Exchange ═══════════════════════════════════════════════════
S="S4-MetalExchange"
print(f"\n─── {S}: Exchange Flow ───")
exch_id=None
if cid:
    r = hit("POST","/api/metal-exchange",Ha,{
        "customer_id":cid,"type":"raw_to_cash","metal_type":"gold",
        "raw_weight":10.0,"raw_purity":18,"pure_weight":7.5,
        "cash_amount":45000,"rate_per_gram":6000,"exchange_date":"2026-05-01"
    })
    chk("Create metal exchange → 201", r, 201, scenario=S)
    exch_id = r.json().get("id") if r.status_code==201 else None
r = hit("GET","/api/metal-exchange",Ha)
chk("List exchanges → 200", r, 200, lambda d:isinstance(d,list), S)
if exch_id:
    chk("New exchange in list", r, 200, lambda d:any(x["id"]==exch_id for x in d), S)
    items = [x for x in r.json() if x["id"]==exch_id]
    if items:
        ex=items[0]
        ok = float(ex.get("cash_amount",0))==45000 and float(ex.get("raw_weight",0))==10.0
        print(f"  {'✅' if ok else '❌'} Exchange amounts match (cash=45000, weight=10.0)")
        if ok: PASS+=1
        else: FAIL+=1; BUGS.append({"scenario":S,"test":"Exchange data integrity","got":str(ex)[:80],"expected":"cash=45000","body":""})

# ══════ S5: Orders ══════════════════════════════════════════════════════════
S="S5-Orders"
print(f"\n─── {S}: Order/Repair Workflow ───")
ord_id=None
if cid:
    r = hit("POST","/api/orders",Ha,{
        "customer_id":cid,"type":"repair","description":"Ring sizing E2E",
        "item_description":"Gold ring","expected_date":"2026-05-30",
        "amount_charged":500,"advance_cash":200
    })
    chk("Create repair order → 201", r, 201, scenario=S)
    ord_id = r.json().get("id") if r.status_code==201 else None
if ord_id:
    r = hit("GET",f"/api/orders/{ord_id}",Ha)
    chk("GET order — status=pending", r, 200, lambda d:d.get("status")=="pending", S)
    chk("order_steps present", r, 200, lambda d:"order_steps" in d, S)
    chk("customer_name populated", r, 200, lambda d:bool(d.get("customer_name")), S)
    chk("→ in_progress", hit("PATCH",f"/api/orders/{ord_id}",Ha,{"status":"in_progress"}),
        200, lambda d:d.get("status")=="in_progress", S)
    chk("→ ready", hit("PATCH",f"/api/orders/{ord_id}",Ha,{"status":"ready"}),
        200, lambda d:d.get("status")=="ready", S)
    r = hit("PATCH",f"/api/orders/{ord_id}",Ha,{"status":"delivered"})
    chk("→ delivered + delivered_at set", r, 200,
        lambda d:d.get("status")=="delivered" and bool(d.get("delivered_at")), S)
    chk("Regression blocked (delivered→pending) → 400",
        hit("PATCH",f"/api/orders/{ord_id}",Ha,{"status":"pending"}), 400, scenario=S)

# ══════ S6: Cross-module ════════════════════════════════════════════════════
S="S6-CrossModule"
print(f"\n─── {S}: Same Customer in All Modules ───")
chk("Outstanding payments → 200",
    hit("GET","/api/payments/outstanding",Ha), 200, lambda d:"items" in d, S)
chk("Reminders summary → has phone",
    hit("GET","/api/reminders/outstanding-summary",Ha), 200,
    lambda d:len(d)==0 or "phone" in d[0], S)
chk("History → items present",
    hit("GET","/api/history",Ha), 200, lambda d:"items" in d, S)
if cid:
    chk("Girvi by customer_id",
        hit("GET","/api/girvi",Ha,params={"customer_id":cid}), 200, lambda d:isinstance(d,list), S)
    chk("Orders by customer_id",
        hit("GET","/api/orders",Ha,params={"customer_id":cid}), 200, lambda d:isinstance(d,list), S)
    chk("Metal exchange by customer_id",
        hit("GET","/api/metal-exchange",Ha,params={"customer_id":cid}), 200, lambda d:isinstance(d,list), S)

# ══════ S7: Payments ════════════════════════════════════════════════════════
S="S7-Payments"
print(f"\n─── {S}: Collection & History ───")
bills = hit("GET","/api/payments/outstanding",Ha).json().get("items",[])
if bills:
    b=bills[0]; bid=b["id"]; due=float(b["dueAmount"])
    print(f"  Bill #{bid}, due=₹{due}")
    r = hit("POST",f"/api/transactions/{bid}/record-payment",Ha,{"amount":100,"payment_mode":"cash"})
    chk("Record ₹100 → 200", r, 200, scenario=S)
    chk("Due reduced by 100", r, 200, lambda d:abs(float(d.get("dueAmount",due))-(due-100))<1, S)
    r = hit("GET","/api/payments/history",Ha)
    chk("History → 200 list", r, 200, lambda d:isinstance(d,list), S)
    chk("History fields complete", r, 200,
        lambda d:len(d)==0 or all(k in d[0] for k in ["id","amount","paymentMode","createdAt","transactionId"]), S)
else:
    print("  ⚠️  SKIP — no outstanding bills")

# ══════ S8: Karigar ═════════════════════════════════════════════════════════
S="S8-Karigar"
print(f"\n─── {S}: Karigar Assignment ───")
r = hit("POST","/api/karigars",Ha,{"name":"E2E Karigar Final","phone":"9911223344","rate_per_gram":25.0})
chk("Create karigar → 201", r, 201, scenario=S)
kar_id = r.json().get("id") if r.status_code==201 else None
if kar_id and cid:
    r = hit("POST","/api/orders",Ha,{
        "customer_id":cid,"type":"new_order","description":"New gold ring",
        "item_description":"22K Ring","expected_date":"2026-06-01",
        "amount_charged":15000,"karigar_id":kar_id
    })
    chk("Order with karigar → 201", r, 201, scenario=S)
    if r.status_code==201:
        chk("karigar_name populated", r, 201, lambda d:bool(d.get("karigar_name")), S)
if kar_id:
    chk("Deactivate karigar",
        hit("PATCH",f"/api/karigars/{kar_id}",Ha,{"is_active":False}), 200, scenario=S)
    chk("Not in active list",
        hit("GET","/api/karigars",Ha,params={"active_only":"true"}), 200,
        lambda d:all(x.get("id")!=kar_id for x in d), S)

# ══════ S9: Dashboard & Analytics ══════════════════════════════════════════
S="S9-Dashboard"
print(f"\n─── {S}: KPI Shape ───")
r = hit("GET","/api/dashboard",Ha)
chk("Dashboard → 200", r, 200, scenario=S)
if r.ok:
    for k in ["kpis","alerts","chart","today_bills","activity"]:
        ok=k in r.json(); print(f"  {'✅' if ok else '❌'} dashboard.{k}")
        if ok: PASS+=1
        else: FAIL+=1; BUGS.append({"scenario":S,"test":f"Missing dashboard.{k}","got":"absent","expected":"present","body":""})
chk("Analytics daily → list",
    hit("GET","/api/analytics/daily",Ha), 200, lambda d:isinstance(d,list), S)
chk("AI metrics → sales+customers",
    hit("GET","/api/ai/business-metrics",Ha), 200, lambda d:"sales" in d and "customers" in d, S)

# ══════ S10: Schema contract ════════════════════════════════════════════════
S="S10-Schema"
print(f"\n─── {S}: API↔Frontend Field Contract ───")
r = hit("GET","/api/payments/outstanding",Ha)
if r.ok and r.json().get("items"):
    item=r.json()["items"][0]
    for f in ["dueAmount","customerName","phone","date","customerId"]:
        ok=f in item; print(f"  {'✅' if ok else '❌'} outstanding.{f}")
        if ok: PASS+=1
        else: FAIL+=1; BUGS.append({"scenario":S,"test":f"outstanding missing '{f}'","got":"absent","expected":"present","body":str(item)[:80]})
r = hit("GET","/api/reminders/outstanding-summary",Ha)
if r.ok and r.json():
    item=r.json()[0]
    for f in ["customerId","customerName","totalDue","phone","billCount"]:
        ok=f in item; print(f"  {'✅' if ok else '❌'} reminder_summary.{f}")
        if ok: PASS+=1
        else: FAIL+=1; BUGS.append({"scenario":S,"test":f"reminder_summary missing '{f}'","got":"absent","expected":"present","body":str(item)[:80]})
rt = requests.post(f"{BASE}/api/auth/login",json={"email":"test1@gmail.com","password":"Admin@1234"}).json().get("refresh_token","")
chk("Auth refresh → 'token' key", requests.post(f"{BASE}/api/auth/refresh",json={"refresh_token":rt}),
    200, lambda d:"token" in d and "access_token" not in d, S)
r = hit("GET","/api/workers",Ha)
if r.ok and r.json():
    w=r.json()[0]
    for f in ["id","name","email","role","designation","phone","monthly_pay"]:
        ok=f in w; print(f"  {'✅' if ok else '❌'} workers[0].{f}")
        if ok: PASS+=1
        else: FAIL+=1; BUGS.append({"scenario":S,"test":f"workers missing '{f}'","got":"absent","expected":"present","body":str(w)[:80]})

# ══════ FINAL REPORT ════════════════════════════════════════════════════════
print(f"""
╔══════════════════════════════════════════════════════════════╗
║                   FINAL AUDIT RESULTS                        ║
╚══════════════════════════════════════════════════════════════╝
  ✅ PASS : {PASS}
  ❌ FAIL : {FAIL}
  📊 Rate : {round(100*PASS/(PASS+FAIL),1) if PASS+FAIL else 0}%
""")
p_map={"S1-RBAC":"P1","S7-Payments":"P1","S10-Schema":"P1",
       "S2-Customer":"P2","S3-Girvi":"P2","S4-MetalExchange":"P2","S5-Orders":"P2","S6-CrossModule":"P2",
       "S8-Karigar":"P3","S9-Dashboard":"P3"}
for b in BUGS: b["priority"]=p_map.get(b["scenario"],"P3")
p1=[b for b in BUGS if b["priority"]=="P1"]
p2=[b for b in BUGS if b["priority"]=="P2"]
p3=[b for b in BUGS if b["priority"]=="P3"]
print(f"  🔴 P1 Critical: {len(p1)}  🟠 P2 High: {len(p2)}  🟡 P3 Medium: {len(p3)}")
for tier,bugs in [("🔴 P1 CRITICAL",p1),("🟠 P2 HIGH",p2),("🟡 P3 MEDIUM",p3)]:
    if bugs:
        print(f"\n  {tier}")
        for i,b in enumerate(bugs,1):
            print(f"    BUG-{i:02d} [{b['scenario']}] {b['test']}")
            print(f"           got={b['got']} expected={b['expected']}")
            if b.get("body"): print(f"           {b['body'][:120]}")
if not BUGS: print("\n  🎉 No bugs found!")
