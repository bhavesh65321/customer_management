import React, { useState, useEffect } from "react";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { formatRupee } from "../../utils/format";

export default function MetalExchangeAdvancePage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/metal-exchange/advance-balance`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ShopLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Advance Balance</h1>
        <p className="text-gray-600 mb-4">
          Metal or money kept with the shop for future jewellery orders.
        </p>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No advance balance.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Metal (g)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Purity</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Money (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((row) => (
                    <tr key={row.customer_id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.customer_name}</td>
                      <td className="px-4 py-3 text-right">{row.advance_metal_weight}</td>
                      <td className="px-4 py-3 text-right">{row.advance_metal_purity ?? "—"}</td>
                      <td className="px-4 py-3 text-right">{formatRupee(row.advance_money)}</td>
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
