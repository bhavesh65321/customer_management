import React, { useState, useEffect } from "react";
import ShopLayout from "../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../api";

export default function DailySalesPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDaily = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/analytics/daily-sales?date=${date}`,
          { headers: authHeaders() }
        );
        if (res.ok) {
          const data = await res.json();
          setSales(Array.isArray(data) ? data : []);
        } else {
          setSales([]);
        }
      } catch {
        setSales([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDaily();
  }, [date]);

  const total = sales.reduce((s, t) => s + (t.grandTotal || 0), 0);

  return (
    <ShopLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Daily Sales</h1>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {sales.length} transaction{sales.length !== 1 ? "s" : ""}
                </span>
                <span className="font-semibold text-gray-900">
                  Total: ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {sales.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No sales on this date.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sales.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {t.customerName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {t.date ? new Date(t.date).toLocaleTimeString() : "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                          {(t.grandTotal ?? 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </ShopLayout>
  );
}
