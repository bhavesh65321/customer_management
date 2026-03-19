# New Features Plan: Girvi, Metal Exchange, Orders/Repairs, Stock

Simple, automatic flows for Surya Shop. Each module has one main idea and minimal steps.

---

## 1. Money Lending (Girvi)

**Idea:** Customer keeps gold/jewelry at shop, gets a loan, pays **monthly interest** until they take the item back.

### Flow
1. **New Girvi:** Select customer → Enter jewelry details (description, weight, purity) → Upload photos → Enter loan amount & monthly interest % → Save. System stores item and starts loan.
2. **Interest:** Calculated **automatically** every month on the loan amount. Staff can “Record interest payment” (amount paid); system shows interest due for current month and total outstanding.
3. **Close:** When customer repays full principal + dues, mark loan closed and return item.

### Data (simple)
- **Girvi loan:** customer_id, store_id, jewelry_description, gross_weight, purity, principal_amount, interest_rate_per_month, start_date, status (active/closed), closed_at.
- **Girvi photos:** loan_id, image_url (path or base64 reference); multiple per loan.
- **Interest payments:** loan_id, amount, for_month (YYYY-MM), paid_at.

### Automation
- **Interest due:** Computed when you open the loan: `months_elapsed = (today - start_date) in months`, `interest_due = principal × rate × months - total_interest_paid`. No cron needed; calculation is on-demand.
- Optional: nightly job that creates “interest due” reminders for active loans.

---

## 2. Metal Exchange (Gold / Silver)

**Idea:** One place for (a) raw → pure metal, (b) raw → cash, (c) advance (metal or money) for future jewelry.

### Transaction types (clear labels)
| Type | What customer does | What we record |
|------|--------------------|----------------|
| **Raw to Pure** | Gives raw metal, takes pure metal (e.g. for making) | Raw weight & purity, pure weight given, making charges if any |
| **Raw to Cash** | Sells raw metal to shop | Raw weight & purity, cash amount paid |
| **Advance (Metal)** | Keeps metal with shop for future order | Metal weight, purity, notes (e.g. “for ring”) |
| **Advance (Money)** | Pays money in advance for future jewelry | Amount, notes |

### Data
- **Metal exchange record:** store_id, customer_id, type (raw_to_pure / raw_to_cash / advance_metal / advance_money), metal_type (gold/silver), raw_weight, raw_purity, pure_weight, cash_amount, making_charges, notes, date. Optional: link to order_id when advance is used.

### Automation
- **Customer balance:** Show “Advance balance” = sum of advance_metal (weight) and advance_money (amount) minus what’s used in orders. Use when creating an order (deduct advance).

---

## 3. Order and Repair Management

**Idea:** One list for “new orders” and “repairs”; each has a status that moves forward.

### Flow
1. **New entry:** Choose “New Order” or “Repair” → Select customer → Short description → Expected date (optional) → Save.
2. **Update status:** Pending → In progress → Ready → Delivered. One click to move.
3. **Charges:** Optional amount when closing (delivered).

### Data
- **Order:** store_id, customer_id, type (new_order / repair), description, item_description (for repair: what was brought), expected_date, status (pending / in_progress / ready / delivered), delivered_at, amount_charged.

### Automation
- Status dropdown only; no auto status change (keeps it simple). Optional: “Ready” can trigger a simple reminder to customer.

---

## 4. Jewellery Item Stock Management

**Idea:** Define **items** (e.g. “22K Ring”, “Silver Chain”) with **quantity**. Stock goes **in** (purchase/add) and **out** (sale/used in order); system keeps count and can warn when low.

### Flow
1. **Item master:** Name, category (e.g. Ring, Chain), metal_type (gold/silver), unit (piece/gram). One list per store.
2. **Stock in:** Select item → Quantity added → Reason (Purchase/Return/Other) → Save. Stock increases automatically.
3. **Stock out:** When creating a **bill (sale)** or marking **order delivered**, select items and quantity → Stock decreases automatically.
4. **Low stock:** Set “Min quantity” per item; dashboard or list shows “Low stock” when current &lt; min.

### Data
- **Stock item (master):** store_id, name, category, metal_type, unit (piece/gram), min_quantity (optional).
- **Stock level:** item_id, quantity (current). Updated by movements.
- **Stock movement:** item_id, quantity (+ or -), type (sale / purchase / order_use / return / adjust), reference_id (e.g. transaction_id or order_id), date.

### Automation
- When a **bill (transaction)** is created with line items that reference stock items, reduce stock by quantity (one movement per line).
- When an **order** is marked “Delivered” and has linked items/quantity, reduce stock.
- “Current stock” = sum of movements (or cached in stock_level table for speed).

---

## Menu (sidebar) – Suggested

- **Girvi (Loans):** Girvi list, New Girvi, Interest due
- **Metal Exchange:** New exchange, Exchange history, Advance balance
- **Orders & Repairs:** All orders, New order/repair
- **Stock:** Items, Stock in/out, Low stock

Keep “Customer Management”, “Billing”, “Payments”, “Notifications”, “Dashboard”, “Workers” as they are; add these four sections above or below “Billing”.

---

## Implementation order

1. Backend models + migrations (Girvi, MetalExchange, Order, StockItem, StockMovement).
2. Backend APIs (list, create, update, plus helpers: interest due, advance balance, low stock).
3. Frontend: sidebar menu items and one page per area (list + simple form).
4. Connect: stock-out from bill creation; advance deduction from order (optional phase 2).
