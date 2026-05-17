import React, { useState, useEffect, useCallback } from "react";
import ShopLayout from "../components/layout/ShopLayout";
import { apiGet, apiPost, API_BASE, authHeaders } from "../api";
import { useLanguage } from "../context/LanguageContext";
import { Spinner } from "../components/ui/Spinner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function fmtInr(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pickOutlook(outlook, key) {
  if (!outlook || typeof outlook !== "object") return null;
  return outlook[key] || outlook[key.replace("_", "")] || null;
}

export default function JewelleryBusinessDashboard() {
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState(null);
  const [daily, setDaily] = useState([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [horizon, setHorizon] = useState(6);
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [source, setSource] = useState(null);

  useEffect(() => {
    setLoadingMetrics(true);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    const from = start.toISOString().slice(0, 10);
    const to = end.toISOString().slice(0, 10);
    Promise.all([
      apiGet("/api/ai/business-metrics").catch(() => null),
      fetch(`${API_BASE}/api/analytics/daily?from_date=${from}&to_date=${to}`, { headers: authHeaders() }).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([m, d]) => {
        setMetrics(m);
        setDaily(Array.isArray(d) ? d : []);
      })
      .catch(() => {
        setMetrics(null);
        setDaily([]);
      })
      .finally(() => setLoadingMetrics(false));
  }, []);

  const runReview = useCallback(async () => {
    setReviewLoading(true);
    setReviewError("");
    try {
      const data = await apiPost("/api/ai/business-review", { horizonMonths: horizon });
      setReview(data.structured || null);
      setSource(data.source || null);
      if (data.warning) setReviewError(data.warning);
    } catch (e) {
      setReviewError(e.message || "Failed to generate review");
      setReview(null);
    } finally {
      setReviewLoading(false);
    }
  }, [horizon]);

  const s30 = metrics?.sales?.last_30_days;
  const s90 = metrics?.sales?.last_90_days;
  const trend = metrics?.sales?.billed_trend_vs_prior_30d_pct;

  const chartData = (daily || []).map((row) => ({
    label: String(row.date || "").slice(5),
    total: row.total ?? 0,
    count: row.count ?? 0,
  }));

  const structured = review || {};

  return (
    <ShopLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t("businessDashboard.title")}</h1>
          <p className="mt-2 text-gray-600 max-w-3xl">{t("businessDashboard.subtitle")}</p>
        </div>

        {loadingMetrics ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" color="amber" center />
          </div>
        ) : !metrics ? (
          <div className="p-6 rounded-lg bg-red-50 text-red-800 text-sm">{t("businessDashboard.loadError")}</div>
        ) : (
          <>
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">{t("businessDashboard.kpiTitle")}</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <KpiCard
                  label={t("businessDashboard.kpiBilled30")}
                  value={fmtInr(s30?.billed_total_inr)}
                  hint={
                    trend != null
                      ? t("businessDashboard.kpiTrendHint").replace("{n}", String(trend))
                      : null
                  }
                />
                <KpiCard
                  label={t("businessDashboard.kpiDue30")}
                  value={fmtInr(s30?.outstanding_due_inr)}
                  hint={t("businessDashboard.kpiDueHint")}
                />
                <KpiCard
                  label={t("businessDashboard.kpiBills30")}
                  value={String(s30?.bills_count ?? 0)}
                  hint={t("businessDashboard.kpiBillsHint")}
                />
                <KpiCard
                  label={t("businessDashboard.kpiCustomers")}
                  value={String(metrics.customers?.active_count ?? 0)}
                  hint={t("businessDashboard.kpiCustomersHint")}
                />
                <KpiCard
                  label={t("businessDashboard.kpiOrders")}
                  value={String(
                    (metrics.orders_repairs?.pending ?? 0) + (metrics.orders_repairs?.in_progress ?? 0)
                  )}
                  hint={t("businessDashboard.kpiOrdersHint")}
                />
                <KpiCard
                  label={t("businessDashboard.kpiStockPieces")}
                  value={String(metrics.serialized_jewellery?.pieces_in_stock ?? 0)}
                  hint={t("businessDashboard.kpiStockHint")}
                />
                <KpiCard
                  label={t("businessDashboard.kpiGirvi")}
                  value={String(metrics.girvi_loans?.active_count ?? 0)}
                  hint={fmtInr(metrics.girvi_loans?.active_principal_inr)}
                />
                <KpiCard
                  label={t("businessDashboard.kpiMetal90")}
                  value={String(metrics.metal_exchange?.transactions_last_90_days ?? 0)}
                  hint={t("businessDashboard.kpiMetalHint")}
                />
                <KpiCard
                  label={t("businessDashboard.kpiLowStock")}
                  value={String(metrics.stock_items?.low_stock_skus_count ?? 0)}
                  hint={t("businessDashboard.kpiLowStockHint")}
                />
              </div>
              <p className="mt-3 text-xs text-gray-500">
                {t("businessDashboard.kpiFootnote")} · {t("businessDashboard.ninetyDayTotal")}{" "}
                {fmtInr(s90?.billed_total_inr)}
              </p>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t("businessDashboard.chartTitle")}</h2>
              {chartData.length === 0 ? (
                <p className="text-gray-500 text-sm">{t("businessDashboard.noChartData")}</p>
              ) : (
                <div className="h-72 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <Tooltip
                        formatter={(value) => fmtInr(value)}
                        labelFormatter={(l) => `${t("businessDashboard.chartDay")} ${l}`}
                      />
                      <Bar dataKey="total" fill="#b45309" radius={[4, 4, 0, 0]} name={t("businessDashboard.chartBilled")} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-xl border border-amber-200/80 shadow-sm p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t("businessDashboard.aiTitle")}</h2>
                  <p className="text-sm text-gray-600 mt-1">{t("businessDashboard.aiIntro")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-sm text-gray-600">{t("businessDashboard.aiHorizon")}</label>
                  <select
                    value={horizon}
                    onChange={(e) => setHorizon(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
                  >
                    <option value={3}>3 {t("businessDashboard.months")}</option>
                    <option value={6}>6 {t("businessDashboard.months")}</option>
                    <option value={12}>12 {t("businessDashboard.months")}</option>
                  </select>
                  <button
                    type="button"
                    onClick={runReview}
                    disabled={reviewLoading}
                    className="px-4 py-2 rounded-md bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 disabled:opacity-50"
                  >
                    {reviewLoading ? t("businessDashboard.aiGenerating") : t("businessDashboard.aiButton")}
                  </button>
                </div>
              </div>
              {source && (
                <p className="text-xs text-gray-500 mb-3">
                  {t("businessDashboard.aiSource")}:{" "}
                  <span className="font-medium">{source === "openai" ? "AI (OpenAI)" : t("businessDashboard.aiSourceRules")}</span>
                </p>
              )}
              {reviewError && (
                <div className="mb-3 text-sm text-amber-900 bg-amber-100/80 rounded-md px-3 py-2">{reviewError}</div>
              )}
              {!review && !reviewLoading && (
                <p className="text-sm text-gray-600">{t("businessDashboard.aiPlaceholder")}</p>
              )}
              {structured && Object.keys(structured).length > 0 && (
                <div className="space-y-6 text-sm text-gray-800">
                  {structured.executive_summary && (
                    <Block title={t("businessDashboard.secSummary")}>
                      <p className="leading-relaxed whitespace-pre-wrap">{structured.executive_summary}</p>
                    </Block>
                  )}
                  {structured.jewellery_business_story && (
                    <Block title={t("businessDashboard.secStory")}>
                      <p className="leading-relaxed whitespace-pre-wrap">{structured.jewellery_business_story}</p>
                    </Block>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    <BulletBlock title={t("businessDashboard.secGood")} items={structured.whats_going_well} />
                    <BulletBlock title={t("businessDashboard.secRisks")} items={structured.risks_and_concerns} />
                  </div>
                  <BulletBlock title={t("businessDashboard.secActions")} items={structured.recommended_actions} />
                  {structured.outlook && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{t("businessDashboard.secOutlook")}</h3>
                      <div className="grid md:grid-cols-3 gap-3">
                        <OutlookCard
                          title={`3 ${t("businessDashboard.months")}`}
                          data={pickOutlook(structured.outlook, "3_months")}
                        />
                        <OutlookCard
                          title={`6 ${t("businessDashboard.months")}`}
                          data={pickOutlook(structured.outlook, "6_months")}
                        />
                        <OutlookCard
                          title={`12 ${t("businessDashboard.months")}`}
                          data={pickOutlook(structured.outlook, "12_months")}
                        />
                      </div>
                    </div>
                  )}
                  {structured.forecast_note && (
                    <p className="text-xs text-gray-500 border-t border-amber-200/60 pt-3">{structured.forecast_note}</p>
                  )}
                </div>
              )}
              <p className="mt-6 text-xs text-gray-500 border-t border-amber-200/60 pt-3">
                {t("businessDashboard.disclaimer")}
              </p>
            </section>
          </>
        )}
      </div>
    </ShopLayout>
  );
}

function KpiCard({ label, value, hint }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3 sm:p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg sm:text-xl font-semibold text-gray-900 mt-1">{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{hint}</p>}
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function BulletBlock({ title, items }) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return null;
  return (
    <div className="bg-white/80 rounded-lg border border-gray-100 p-4">
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <ul className="list-disc list-inside space-y-1.5 text-gray-700">
        {list.map((x, i) => (
          <li key={i}>{typeof x === "string" ? x : JSON.stringify(x)}</li>
        ))}
      </ul>
    </div>
  );
}

function OutlookCard({ title, data }) {
  if (!data || typeof data !== "object") {
    return (
      <div className="bg-white/80 rounded-lg border border-gray-100 p-3 text-gray-500 text-xs">{title}: —</div>
    );
  }
  const dir = data.sales_direction || data.direction || "—";
  return (
    <div className="bg-white/90 rounded-lg border border-gray-100 p-3">
      <p className="text-xs font-semibold text-amber-900 uppercase">{title}</p>
      <p className="text-xs text-amber-800 mt-1 font-medium capitalize">{String(dir).replace(/_/g, " ")}</p>
      {data.summary && <p className="text-xs text-gray-700 mt-2 leading-snug">{data.summary}</p>}
      {data.reasoning && <p className="text-xs text-gray-500 mt-1">{data.reasoning}</p>}
    </div>
  );
}
