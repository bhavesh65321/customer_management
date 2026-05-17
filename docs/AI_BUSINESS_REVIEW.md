# AI Jewellery Business Review

## Dashboard

Staff: **Dashboard → Jewellery business** (`/jewellery-business`).

The page shows:

- **Metrics** from your data: sales (30 / 90 days), dues, customers, orders/repairs, serialized stock, girvi, metal exchange, low-stock SKUs.
- **Sales chart** (last 90 days).
- **AI review** (optional): click **Generate AI review** and pick a **3 / 6 / 12 month** focus. The model explains what is going well, risks, actions, and directional outlooks for 3, 6, and 12 months.

## API

- `GET /api/ai/business-metrics` — snapshot JSON only (fast, no external AI).
- `POST /api/ai/business-review` — body `{ "horizonMonths": 6 }` (3, 6, or 12). Returns `structured` JSON plus `source` (`openai` or `rules_engine`).
- Query `includeSnapshot=true` on POST/GET review if you need the raw metrics in the same response.

## Configuration

Set in `.env` (see `.env.example`):

- `OPENAI_API_KEY` — enables OpenAI-powered narrative and richer analysis.
- `OPENAI_MODEL` — default `gpt-4o-mini`.
- `AI_BUSINESS_REVIEW_ENABLED=0` — force offline rules-only mode even if a key is set.

Forecasts extrapolate recent billing patterns; they are **not** financial advice and ignore external factors (gold price, festivals, etc.) unless you describe them elsewhere.
