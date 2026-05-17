import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import ShopLayout from "../components/layout/ShopLayout";
import { API_BASE, authHeaders, getToken, parseJwt } from "../api";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { SkeletonCardRow } from "../components/ui/Skeleton";
import AIAssistant from "../components/ui/AIAssistant";

// ── Formatters ────────────────────────────────────────────────────────────
const fmtMoney = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtMoneyShort = (n) => {
  if (n >= 100000) return "₹" + (n / 100000).toFixed(1) + "L";
  if (n >= 1000)   return "₹" + (n / 1000).toFixed(1) + "K";
  return "₹" + Math.round(n || 0);
};

const ENTITY_ICON = {
  transaction:     "🧾",
  customer:        "👤",
  order:           "📦",
  karigar:         "🧑",
  inventory_piece: "💍",
  stock_item:      "📊",
  girvi:           "💰",
  payment:         "💵",
};

function KpiCard({ label, value, sub, subColor, onClick, icon }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-gray-200 rounded-xl p-4 ${onClick ? "cursor-pointer hover:border-amber-300 hover:shadow-sm transition-all" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && (
        <div className={`text-xs mt-1 font-medium ${subColor || "text-gray-400"}`}>{sub}</div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-xs">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-amber-700 font-bold">{fmtMoney(payload[0]?.value)}</p>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const token = getToken();
  const jwt = token ? parseJwt(token) : null;
  const userName = jwt?.name || jwt?.sub?.split("@")[0] || "there";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState("7d");

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard`, { headers: authHeaders() });
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis || {};
  const alerts = data?.alerts || {};
  const chart = data?.chart || [];
  const activity = data?.activity || [];
  const todayBills = data?.today_bills || [];

  const overdueOrders = alerts.overdue_orders || [];
  const lowStock = alerts.low_stock || [];
  const hasAlerts = overdueOrders.length > 0 || lowStock.length > 0;

  const revChangeSub = kpis.rev_change_pct != null
    ? kpis.rev_change_pct >= 0
      ? `↑ ${kpis.rev_change_pct}% vs yesterday`
      : `↓ ${Math.abs(kpis.rev_change_pct)}% vs yesterday`
    : `${kpis.today_bills || 0} bills today`;

  const revChangeColor = kpis.rev_change_pct == null
    ? "text-gray-400"
    : kpis.rev_change_pct >= 0
    ? "text-green-600"
    : "text-red-500";

  return (
    <ShopLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Greeting ── */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {greeting()}, {userName} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{todayStr}</p>
          </div>
          <Link to="/shop"
            className="px-5 py-2.5 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 shadow-sm">
            💰 New Bill
          </Link>
        </div>

        {/* ── KPI Cards ── */}
        {loading ? (
          <SkeletonCardRow count={4} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Today's Revenue"
              value={fmtMoneyShort(kpis.today_revenue)}
              sub={revChangeSub}
              subColor={revChangeColor}
              icon="💰"
            />
            <KpiCard
              label="This Month"
              value={fmtMoneyShort(kpis.month_revenue)}
              sub={`${kpis.month_bills || 0} bills`}
              icon="📅"
            />
            <KpiCard
              label="Ready to Deliver"
              value={kpis.ready_orders || 0}
              sub={kpis.ready_orders > 0 ? "Tap to view →" : "No pending"}
              subColor={kpis.ready_orders > 0 ? "text-green-600" : "text-gray-400"}
              icon="✅"
              onClick={kpis.ready_orders > 0 ? () => navigate("/orders?status=ready") : undefined}
            />
            <KpiCard
              label="Pending Dues"
              value={fmtMoneyShort(kpis.total_pending_due)}
              sub={kpis.pending_due_customers > 0 ? `${kpis.pending_due_customers} customers` : "All clear"}
              subColor={kpis.total_pending_due > 0 ? "text-red-500" : "text-green-600"}
              icon="⏳"
              onClick={() => navigate("/payments?tab=outstanding")}
            />
          </div>
        )}

        {/* ── Alerts ── */}
        {!loading && hasAlerts && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <span className="text-sm font-bold text-gray-800">⚠ Needs Attention</span>
            </div>
            <div className="divide-y divide-gray-50">
              {overdueOrders.map((o) => (
                <div key={o.id}
                  className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/orders/${o.id}`)}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{o.customer_name}</span>
                      {o.description && (
                        <span className="text-sm text-gray-500"> — {o.description}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-red-600 flex-shrink-0">
                    {o.days_late}d overdue
                  </span>
                </div>
              ))}
              {lowStock.map((s) => (
                <div key={s.id}
                  className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate("/stock/low-stock")}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900">{s.name}</span>
                    <span className="text-xs text-gray-400">— {s.quantity} left</span>
                  </div>
                  <span className="text-xs font-semibold text-yellow-600 flex-shrink-0">
                    Low stock
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Revenue chart ── */}
        {!loading && chart.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-gray-800">📊 Revenue</span>
              <div className="flex gap-1">
                {["7d","30d","3m"].map((r) => (
                  <button key={r}
                    onClick={() => setChartRange(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      chartRange === r
                        ? "bg-amber-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chart} barSize={28}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {chart.map((entry, index) => (
                    <Cell
                      key={entry.date || `cell-${index}`}
                      fill={entry.is_today ? "#d97706" : "#fcd34d"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-400 text-center mt-1">
              Gold bar = today
            </p>
          </div>
        )}

        {/* ── Bottom two columns ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Today's bills */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800">🧾 Today's Bills</span>
              <Link to="/daily-sales" className="text-xs text-amber-600 hover:underline font-medium">
                See all →
              </Link>
            </div>
            {todayBills.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No bills yet today
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {todayBills.map((b) => (
                  <div key={b.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{b.customer_name}</p>
                      <p className="text-xs text-gray-400">{b.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{fmtMoney(b.grand_total)}</p>
                      {b.due_amount > 0 && (
                        <p className="text-xs text-red-500">Due: {fmtMoney(b.due_amount)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-bold text-gray-800">🕐 Today's Activity</span>
            </div>
            {activity.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No activity today yet
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {activity.map((a) => (
                  <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                    <span className="text-base flex-shrink-0 mt-0.5">
                      {ENTITY_ICON[a.entity_type] || "📌"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-snug">{a.text}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{a.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Quick links ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "New Order",     icon: "📦", to: "/orders/new" },
            { label: "Exchange",      icon: "🔄", to: "/metal-exchange/new" },
            { label: "Add Customer",  icon: "👤", to: "/addCustomer" },
            { label: "GST Reports",   icon: "📋", to: "/gst-reports" },
          ].map((q) => (
            <Link key={q.to} to={q.to}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:border-amber-300 hover:shadow-sm transition-all">
              <span className="text-xl">{q.icon}</span>
              <span className="text-sm font-medium text-gray-700">{q.label}</span>
            </Link>
          ))}
        </div>

      </div>
      <AIAssistant />
    </ShopLayout>
  );
}
