import React, { useState, useEffect } from "react";
import ShopLayout from "../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../api";
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

export default function ChartsDashboard() {
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [fromDate, toDate]);

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
        <div className="flex flex-wrap gap-4 mb-6">
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
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
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
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Sales by day</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
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
                            <Cell key={index} fill={entry.color} />
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
          </>
        )}
      </div>
    </ShopLayout>
  );
}
