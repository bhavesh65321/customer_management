import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";

/* ── Helpers ── */
const fmtDate = (s) =>
  s
    ? new Date(s).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const fmtMoney = (n) =>
  n != null
    ? `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n)}`
    : null;
const fmtG = (n) =>
  n != null
    ? `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(n)}g`
    : null;

const TYPE_CONFIG = {
  raw_to_cash: {
    label: "Old Jewellery → Cash",
    emoji: "💰",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  raw_to_pure: {
    label: "Old Jewellery → Pure Gold",
    emoji: "🔄",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  advance_metal: {
    label: "Metal Advance",
    emoji: "🏦",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  advance_money: {
    label: "Cash Advance",
    emoji: "📋",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
};

const FILTERS = ["all", "raw_to_cash", "raw_to_pure", "advance_metal", "advance_money"];
const FILTER_LABELS = {
  all: "All",
  raw_to_cash: "💰 Cash",
  raw_to_pure: "🔄 Pure Gold",
  advance_metal: "🏦 Metal Advance",
  advance_money: "📋 Cash Advance",
};

export default function MetalExchangePage() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/metal-exchange`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = list.filter((row) => {
    const matchType = filter === "all" || row.type === filter;
    const matchSearch =
      !search ||
      (row.customer_name || "").toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  // Summary stats
  const totalCash = list
    .filter((r) => r.type === "raw_to_cash" && r.cash_amount)
    .reduce((s, r) => s + r.cash_amount, 0);
  const totalAdvanceMetal = list
    .filter((r) => r.type === "advance_metal" && r.raw_weight)
    .reduce((s, r) => s + r.raw_weight, 0);
  const totalAdvanceMoney = list
    .filter((r) => r.type === "advance_money" && r.cash_amount)
    .reduce((s, r) => s + r.cash_amount, 0);

  return (
    <ShopLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Metal Exchange</h1>
            <p className="text-sm text-gray-500 mt-0.5">{list.length} records</p>
          </div>
          <Link
            to="/metal-exchange/new"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl"
          >
            + New Exchange
          </Link>
        </div>

        {/* ── Summary cards ── */}
        {!loading && list.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">💰 Cash paid out</p>
              <p className="text-xl font-extrabold text-green-700">
                {fmtMoney(totalCash)}
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">🏦 Metal advance held</p>
              <p className="text-xl font-extrabold text-yellow-700">
                {fmtG(totalAdvanceMetal) ?? "—"}
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">📋 Cash advance held</p>
              <p className="text-xl font-extrabold text-purple-700">
                {fmtMoney(totalAdvanceMoney) ?? "—"}
              </p>
            </div>
          </div>
        )}

        {/* ── Search + Filter ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  filter === f
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                }`}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* ── List ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-3xl mb-2">🔄</p>
              <p className="text-gray-500 text-sm">No exchange records found.</p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[1fr_1.2fr_1.6fr_0.8fr_0.8fr_1fr] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <span>Date</span>
                <span>Customer</span>
                <span>Type</span>
                <span className="text-right">Weight</span>
                <span className="text-right">Purity</span>
                <span className="text-right">Value</span>
              </div>

              {filtered.map((row) => {
                const cfg = TYPE_CONFIG[row.type] || {
                  label: row.type,
                  emoji: "•",
                  bg: "bg-gray-50",
                  text: "text-gray-700",
                  border: "border-gray-200",
                };

                // Value: prefer cash_amount, else pure_weight
                const valueStr =
                  row.cash_amount != null
                    ? fmtMoney(row.cash_amount)
                    : row.pure_weight != null
                    ? `${fmtG(row.pure_weight)} pure`
                    : null;

                return (
                  <div
                    key={row.id}
                    className="grid grid-cols-[1fr_1.2fr_1.6fr_0.8fr_0.8fr_1fr] gap-2 items-center px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate("/metal-exchange/new")}
                  >
                    {/* Date */}
                    <span className="text-xs text-gray-500">{fmtDate(row.exchange_date)}</span>

                    {/* Customer */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px] flex-shrink-0">
                        {(row.customer_name || "?")[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {row.customer_name}
                      </span>
                    </div>

                    {/* Type badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border w-fit ${cfg.bg} ${cfg.text} ${cfg.border}`}
                    >
                      {cfg.emoji} {cfg.label}
                    </span>

                    {/* Weight */}
                    <span className="text-right text-sm text-gray-700">
                      {row.raw_weight != null ? fmtG(row.raw_weight) : "—"}
                    </span>

                    {/* Purity */}
                    <span className="text-right text-xs text-gray-500">
                      {row.raw_purity != null ? `${row.raw_purity}%` : "—"}
                    </span>

                    {/* Value */}
                    <span
                      className={`text-right text-sm font-semibold ${
                        row.type === "advance_metal" || row.type === "advance_money"
                          ? "text-purple-700"
                          : "text-green-700"
                      }`}
                    >
                      {valueStr ?? "—"}
                    </span>
                  </div>
                );
              })}

              {/* Footer totals for filtered view */}
              {filter !== "all" && filtered.length > 0 && (
                <div className="grid grid-cols-[1fr_1.2fr_1.6fr_0.8fr_0.8fr_1fr] gap-2 px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs font-bold text-gray-600">
                  <span className="col-span-3">
                    {filtered.length} record{filtered.length > 1 ? "s" : ""}
                  </span>
                  <span className="text-right">
                    {filtered.reduce((s, r) => s + (r.raw_weight || 0), 0).toFixed(2)}g
                  </span>
                  <span />
                  <span className="text-right text-green-700">
                    {fmtMoney(filtered.reduce((s, r) => s + (r.cash_amount || 0), 0))}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick links */}
        <div className="mt-4 flex gap-3 text-xs text-gray-500">
          <Link to="/metal-exchange/advance" className="hover:text-indigo-600 hover:underline">
            View Advance Balances →
          </Link>
          <Link to="/metal-exchange/rates" className="hover:text-indigo-600 hover:underline">
            Manage Metal Rates →
          </Link>
        </div>
      </div>
    </ShopLayout>
  );
}
