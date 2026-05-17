# Jewellery intelligence features

Implemented capabilities aligned with “item intelligence”, weight/stone fields, karigar + workflow hints, and rule-based insights.

## Backend

| Area | Details |
|------|---------|
| **Serialized pieces** | `inventory_pieces` extended with `stone_weight_carat`, `stone_type`, `wastage_pct`, `location_bin`, `design_sku`, `status`, `notes`. |
| **Lifecycle** | `piece_lifecycle_events` with `event_type`, notes, optional karigar/order links, optional `transaction_id` for sales. |
| **Karigars** | `karigars` per store; orders can reference `karigar_id` and `workflow_step`. |
| **Insights** | `GET /api/insights` — slow-moving stock (90+ days in `in_stock`), overdue orders (expected date &lt; 7 days ago), month-to-date sales. |
| **Billing** | `Product.pieceId` optional; on successful sale, matching pieces get a `sold` lifecycle event and `status = sold`. |

## Frontend

- **Jewellery intelligence** menu: serialized list, add piece, karigars, insights.
- **Create bill:** optional “Serialized piece ID” per line.
- **Orders:** optional karigar and workflow step on create; list shows karigar and step.

## Migrations

- **On startup**, `main.py` runs `ensure_jewellery_intelligence_schema(engine)` after `create_all()` to **ALTER** existing `orders` and `inventory_pieces` tables with any missing columns (MySQL/SQLite/PostgreSQL). This fixes 500s when the ORM expects `karigar_id` / `workflow_step` etc. but the live DB was created before those fields existed.
- You can still use `docs/sql/add_jewellery_intelligence.sql` for manual DBA runs or if you prefer not to rely on startup DDL.
