from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

REVIEW_JSON_SCHEMA_HINT = """Return a single JSON object with exactly these keys:
- executive_summary: string (3-5 sentences, plain language for a jeweller)
- jewellery_business_story: string (weave together sales, credit, custom orders, stock, girvi/metal if relevant — the "story" of this shop right now)
- whats_going_well: array of strings (3-6 bullets)
- risks_and_concerns: array of strings (3-6 bullets; include credit/due, overdue orders, slow stock if data supports)
- recommended_actions: array of strings (5-10 practical next steps for an Indian jewellery store)
- outlook: object with keys "3_months", "6_months", "12_months". Each value is an object:
  { "summary": string, "sales_direction": one of "likely_up", "likely_flat", "likely_down", "uncertain", "reasoning": string }
- forecast_note: string (explain that forecasts extrapolate recent averages and are uncertain; not financial advice)
"""


def _fallback_review(snapshot: Dict[str, Any], primary_months: int) -> Dict[str, Any]:
    s30 = snapshot.get("sales", {}).get("last_30_days", {})
    s90 = snapshot.get("sales", {}).get("last_90_days", {})
    trend = snapshot.get("sales", {}).get("billed_trend_vs_prior_30d_pct")
    due = float(s30.get("outstanding_due_inr") or 0)
    billed_30 = float(s30.get("billed_total_inr") or 0)
    daily = snapshot.get("sales", {}).get("daily_bills_last_90_days") or []
    n_days = max(len(daily), 1)
    avg_daily_billed = sum(d.get("billed_inr", 0) for d in daily) / max(len(daily), 1)

    def extrap(months: int) -> Dict[str, Any]:
        projected = avg_daily_billed * 30 * months
        direction = "uncertain"
        if trend is not None:
            if trend > 5:
                direction = "likely_up"
            elif trend < -5:
                direction = "likely_down"
            else:
                direction = "likely_flat"
        return {
            "summary": (
                f"Rough directional view: if recent ~90-day daily billing stays near ₹{avg_daily_billed:,.0f}/day, "
                f"similar activity might imply on the order of ₹{projected:,.0f} billed over ~{months} months "
                f"(very approximate; seasonality and big tickets not modeled)."
            ),
            "sales_direction": direction,
            "reasoning": "Based on average daily billed in the last 90 days and month-on-month trend vs prior 30 days.",
        }

    concerns: List[str] = []
    if due > 0:
        concerns.append(
            f"Outstanding dues on bills are ₹{due:,.2f} — tighten follow-ups and payment reminders."
        )
    od = snapshot.get("orders_repairs", {}).get("overdue_vs_expected_date") or 0
    if od > 0:
        concerns.append(f"{od} order(s)/repairs look overdue vs expected date — update customers and workflow.")
    slow = snapshot.get("serialized_jewellery", {}).get("slow_moving_in_stock_over_90_days") or 0
    if slow > 0:
        concerns.append(f"{slow} serialized piece(s) in stock over 90 days — consider pricing, display, or offers.")
    if not concerns:
        concerns.append("No major red flags in the automated checks; still review margins and inventory regularly.")

    good: List[str] = []
    if billed_30 > 0:
        good.append(f"Billing activity in the last 30 days: ₹{billed_30:,.2f} — keep tracking conversion from visits to bills.")
    ac = snapshot.get("customers", {}).get("active_count") or 0
    if ac > 0:
        good.append(f"{ac} active customers on file — nurture repeats and referrals.")
    if trend is not None and trend > 0:
        good.append(f"Billing vs prior 30 days is up about {trend}% — momentum to protect.")

    actions = [
        "Review top customers with high due amounts weekly.",
        "Call overdue order/repair customers with a clear ready date or delay reason.",
        "Run a slow-stock review for pieces over 90 days in stock.",
        "Track month-to-date billing vs last month every week.",
    ]

    story_parts = [
        f"In the last 30 days the shop recorded ₹{billed_30:,.2f} on bills with ₹{due:,.2f} still due from customers.",
        f"There are {snapshot.get('orders_repairs', {}).get('pending', 0)} pending and "
        f"{snapshot.get('orders_repairs', {}).get('in_progress', 0)} in-progress orders/repairs.",
        f"Serialized stock shows {snapshot.get('serialized_jewellery', {}).get('pieces_in_stock', 0)} pieces in stock.",
    ]
    if snapshot.get("girvi_loans", {}).get("active_count", 0):
        story_parts.append(
            f"Girvi: {snapshot['girvi_loans']['active_count']} active loan(s), "
            f"₹{snapshot['girvi_loans'].get('active_principal_inr', 0):,.2f} principal."
        )

    return {
        "executive_summary": (
            "This review is generated from your shop data without an AI API key. "
            "Add OPENAI_API_KEY for deeper narrative and forecasting. "
            f"Focus horizon you selected: {primary_months} months."
        ),
        "jewellery_business_story": " ".join(story_parts),
        "whats_going_well": good or ["Keep recording every bill and payment so trends stay visible."],
        "risks_and_concerns": concerns,
        "recommended_actions": actions,
        "outlook": {
            "3_months": extrap(3),
            "6_months": extrap(6),
            "12_months": extrap(12),
        },
        "forecast_note": (
            "Figures extrapolate recent daily averages; they are not predictions of profit or cash flow. "
            "Festivals, gold rates, and one-off high-value sales can swing real results. Not financial advice."
        ),
    }


def _call_openai(snapshot: Dict[str, Any], primary_months: int, api_key: str, model: str) -> Dict[str, Any]:
    system = (
        "You are an experienced advisor to independent jewellery retailers in India. "
        "You only use the JSON metrics provided; do not invent specific rupee amounts that are not implied by the data. "
        "Be practical, respectful, and clear. Use Indian business context (bills, due, custom orders, karigar, girvi, hallmarked stock). "
        + REVIEW_JSON_SCHEMA_HINT
    )
    user = json.dumps(
        {
            "primary_forecast_horizon_months": primary_months,
            "metrics": snapshot,
        },
        default=str,
    )
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.35,
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = json.loads(resp.read().decode())
    content = raw["choices"][0]["message"]["content"]
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        logger.warning("OpenAI returned non-JSON body")
        raise


def generate_business_review(snapshot: Dict[str, Any], primary_horizon_months: int = 6) -> Dict[str, Any]:
    primary_horizon_months = primary_horizon_months if primary_horizon_months in (3, 6, 12) else 6
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    model = (os.getenv("OPENAI_MODEL") or "gpt-4o-mini").strip()
    disabled = os.getenv("AI_BUSINESS_REVIEW_ENABLED", "1").lower() in ("0", "false", "no")

    if disabled or not api_key:
        structured = _fallback_review(snapshot, primary_horizon_months)
        return {
            "source": "rules_engine",
            "model": None,
            "structured": structured,
        }

    try:
        structured = _call_openai(snapshot, primary_horizon_months, api_key, model)
        return {
            "source": "openai",
            "model": model,
            "structured": structured,
        }
    except urllib.error.HTTPError as e:
        logger.warning("OpenAI HTTP error: %s", e)
        body = e.read().decode(errors="replace") if e.fp else ""
        structured = _fallback_review(snapshot, primary_horizon_months)
        return {
            "source": "rules_engine",
            "model": model,
            "structured": structured,
            "warning": f"AI service error ({e.code}). Showing data-driven fallback. {body[:200]}",
        }
    except Exception as e:
        logger.exception("OpenAI call failed")
        structured = _fallback_review(snapshot, primary_horizon_months)
        return {
            "source": "rules_engine",
            "model": model,
            "structured": structured,
            "warning": f"AI unavailable ({e!s}). Showing data-driven fallback.",
        }
