# Activity history

Staff can open **Dashboard → Activity history** in the shop app. The list shows **when**, **who** (name from login), **area** (customer, bill, jewellery piece, order, etc.), and a short **plain-language** description.

## API

- `GET /api/history?limit=50&offset=0` — returns `{ total, items: [{ id, at, who, what, area, action }] }`.
- Store staff only see rows for their store; admins without a store see all rows.

## Backend

Events are stored in `audit_log` (see `ensure_audit_log_schema` on startup). `log_activity()` in `utils/activity.py` writes a row after the main database change commits.
