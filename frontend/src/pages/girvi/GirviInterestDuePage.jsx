import React, { useState, useEffect } from "react";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { formatRupee } from "../../utils/format";

export default function GirviInterestDuePage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/girvi/interest-due`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ShopLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Interest Due (Girvi)</h1>
        <p className="text-gray-600 mb-4">
          Interest is calculated automatically every month on the loan amount. Shown below for active loans.
        </p>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No active loans or no interest due.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan ID</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Principal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate/month %</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Months</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Interest paid</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((row) => (
                    <tr key={row.loan_id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.loan_id}</td>
                      <td className="px-4 py-3 text-right">{formatRupee(row.principal)}</td>
                      <td className="px-4 py-3 text-right">{row.rate_per_month}%</td>
                      <td className="px-4 py-3 text-right">{row.months_elapsed}</td>
                      <td className="px-4 py-3 text-right">{formatRupee(row.total_interest_paid)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-700">
                        {formatRupee(row.interest_outstanding)}
                      </td>
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
