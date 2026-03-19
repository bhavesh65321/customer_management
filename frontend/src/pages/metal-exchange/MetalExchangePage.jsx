import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { formatRupee } from "../../utils/format";

const TYPE_LABELS = {
  raw_to_pure: "Raw → Pure",
  raw_to_cash: "Raw → Cash",
  advance_metal: "Advance (Metal)",
  advance_money: "Advance (Money)",
};

export default function MetalExchangePage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/metal-exchange`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ShopLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Metal Exchange History</h1>
          <Link
            to="/metal-exchange/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            New Exchange
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No exchange records.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Raw (g)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pure (g)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-gray-600">
                        {row.exchange_date ? new Date(row.exchange_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{row.customer_name}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-700">
                          {TYPE_LABELS[row.type] || row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{row.raw_weight != null ? row.raw_weight : "—"}</td>
                      <td className="px-4 py-3 text-right">{row.pure_weight != null ? row.pure_weight : "—"}</td>
                      <td className="px-4 py-3 text-right">{row.cash_amount != null ? formatRupee(row.cash_amount) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ShopLayout>
  );
}
