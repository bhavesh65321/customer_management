import React, { useState, useEffect } from "react";
import ShopLayout from "../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../api";
import { Spinner } from "../components/ui/Spinner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#22c55e", "#ef4444"];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ChartsDashboard() {
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [yearly, setYearly] = useState([]);
  const [customerAnalytics, setCustomerAnalytics] = useState([]);
  const [period, setPeriod] = useState("daily");
  const [yearFilter, setYearFilter] = useState(() => new Date().getFullYear());
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (period !== "daily") return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaryRes, dailyRes] = await Promise.all([
          fetch(
            `${API_BASE}/api/analytics/summary?from_date=${fromDate}&to_date=${toDate}`,
            { headers: authHeaders() }
          ),
          fetch(
            `${API_BASE}/api/analytics/daily?from_date=${fromDate}&to_date=${toDate}`,
            { headers: authHeaders() }
          ),
        ]);
        if (summaryRes.ok) setSummary(await summaryRes.json());
        else setSummary(null);
        if (dailyRes.ok) setDaily(await dailyRes.json());
        else setDaily([]);
      } catch {
        setSummary(null);
        setDaily([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period, fromDate, toDate]);

  useEffect(() => {
    if (period !== "monthly") return;
    setLoading(true);
    fetch(`${API_BASE}/api/analytics/monthly?year=${yearFilter}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setMonthly(
          data
            .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month))
            .map((r) => ({
              ...r,
              label: `${MONTH_NAMES[r.month - 1]} ${r.year}`,
            }))
        );
      })
      .catch(() => setMonthly([]))
      .finally(() => setLoading(false));
  }, [period, yearFilter]);

  useEffect(() => {
    if (period !== "yearly") return;
    setLoading(true);
    fetch(`${API_BASE}/api/analytics/yearly`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setYearly(data.sort((a, b) => a.year - b.year)))
      .catch(() => setYearly([]))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    fetch(`${API_BASE}/api/analytics/customer-analytics?limit=10`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then(setCustomerAnalytics)
      .catch(() => setCustomerAnalytics([]));
  }, []);

  const chartData =
    period === "daily"
      ? daily
      : period === "monthly"
        ? monthly
        : yearly.map((r) => ({ ...r, label: String(r.year) }));
  const chartDataKey = period === "daily" ? "date" : "label";
  const chartTitle =
    period === "daily"
      ? "Sales by day"
      : period === "monthly"
        ? `Sales by month (${yearFilter})`
        : "Sales by year";

  const pieData = summary
    ? [
        { name: "Paid", value: summary.totalPaid || 0, color: COLORS[1] },
        { name: "Due", value: summary.totalDue || 0, color: COLORS[2] },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <ShopLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Charts & Dashboards</h1>
        <div className="flex flex-wrap gap-4 mb-6 items-end">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-gray-600">View:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          {period === "daily" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </>
          )}
          {period === "monthly" && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Year</label>
              <input
                type="number"
                min="2020"
                max="2030"
                value={yearFilter}
                onChange={(e) => setYearFilter(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md w-24"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" center />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <p className="text-sm text-gray-500">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{summary?.count ?? 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <p className="text-sm text-gray-500">Total sales (₹)</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary?.totalAmount?.toLocaleString("en-IN") ?? "0"}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <p className="text-sm text-gray-500">Pending (₹)</p>
                <p className="text-2xl font-bold text-red-600">
                  {summary?.totalDue?.toLocaleString("en-IN") ?? "0"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">{chartTitle}</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis dataKey={chartDataKey} tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Total"]} />
                      <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Paid vs due</h2>
                {pieData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={entry.name || `pie-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, ""]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-gray-500 py-8 text-center">No data in range</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer analytics (top by sales)</h2>
              {customerAnalytics.length === 0 ? (
                <p className="text-gray-500 py-6 text-center">No customer data yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 font-medium text-gray-600">Customer</th>
                        <th className="text-right py-2 font-medium text-gray-600">Transactions</th>
                        <th className="text-right py-2 font-medium text-gray-600">Total spent (₹)</th>
                        <th className="text-right py-2 font-medium text-gray-600">Outstanding (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerAnalytics.map((c) => (
                        <tr key={c.customerId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 text-gray-900">{c.customerName}</td>
                          <td className="py-2 text-right text-gray-700">{c.transactionCount}</td>
                          <td className="py-2 text-right text-gray-700">
                            {(c.totalSpent || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 text-right text-amber-700">
                            {(c.totalDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ShopLayout>
  );
}
