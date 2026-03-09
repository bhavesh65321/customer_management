# Code Structure and Conventions

## Frontend (React)

### Naming
- **Components:** PascalCase (e.g. `CustomerSelectionStep`, `DataTable`, `PageSection`).
- **Props, state, handlers:** camelCase (e.g. `customerMode`, `onModeChange`, `handleCreateCustomer`).
- **Constants:** UPPER_SNAKE for true constants (e.g. `INITIAL_PRODUCT`, `CUSTOMER_FORM_INITIAL`).

### Layout
- **`utils/`** – Pure helpers with no UI:
  - `format.js`: `formatDate`, `formatCurrency`, `formatRupee`, `formatPay`.
  - `productCalculations.js`: `INITIAL_PRODUCT`, `parseNumber`, `calculateProductTotals`, `grandTotalFromProducts`, `getWeightUnit`.
  - `customerPayload.js`: `CUSTOMER_FORM_INITIAL`, `customerFormToPayload`.
- **`components/ui/`** – Reusable UI building blocks:
  - `DataTable`, `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell`, `TableHeaderCell`.
  - `PageSection`: `PageContainer`, `SectionCard`.
  - `Modal`: Headless UI-based modal wrapper.
- **`components/shop/`** – Feature-specific components (e.g. `CustomerSelectionStep` for the Create Bill flow).
- **Pages** – Compose layout + components + API; keep them thin by moving logic into hooks or child components.

### Patterns
- Reuse shared utils instead of duplicating `formatDate`, product math, or customer payload building.
- Prefer small, named components over large single-file pages.
- Use `PageContainer` and `SectionCard` for consistent shop page layout and cards.

---

## Backend (Python)

### Naming
- **Modules/files:** `snake_case` (e.g. `transaction_controller`, `db_filters`).
- **Functions, variables:** `snake_case`.
- **Classes:** `PascalCase`.
- **API request/response bodies:** Kept as-is (camelCase in JSON for transaction/analytics/payments to match frontend).

### Layout
- **`core/`** – Shared app-level logic:
  - `db_filters.py`: `apply_store_filter(query, model, payload)` for store-scoped queries.
- **`controllers/`** – Business logic for a domain (e.g. `transaction_controller`: create/get/update transaction).
- **`services/`** – Cross-cutting or external concerns (e.g. `notification`: email/SMS).
- **`routes/`** – Thin HTTP layer: validate input, call controller/service, return response. Use `apply_store_filter` for any store-scoped list/analytics.

### Patterns
- Use `apply_store_filter(q, Model, payload)` instead of duplicating store-filter logic in each route.
- Controllers raise `HTTPException`; routes rely on that and avoid large try/except where possible.
- Transaction controller lives in `transaction_controller.py` (no typo in filename).
