import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { formatDate, formatRupee } from "../../utils/format";

export default function GirviPage() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");

  useEffect(() => {
    const fetchLoans = async () => {
      setLoading(true);
      try {
        const url = filter ? `${API_BASE}/api/girvi?status=${filter}` : `${API_BASE}/api/girvi`;
        const res = await fetch(url, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setLoans(Array.isArray(data) ? data : []);
        } else {
          setLoans([]);
        }
      } catch {
        setLoans([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLoans();
  }, [filter]);

  return (
    <ShopLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Girvi (Loans)</h1>
          <Link
            to="/girvi/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            New Girvi
          </Link>
        </div>
        <div className="flex gap-2 mb-4">
          {["active", "closed"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                filter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {s === "active" ? "Active" : "Closed"}
            </button>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : loans.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No loans found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Principal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loans.map((loan) => (
                    <tr key={loan.id}>
                      <td className="px-4 py-3 text-gray-900">{loan.customer_name}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{loan.jewelry_description}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatRupee(loan.principal_amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(loan.start_date)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                            loan.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {loan.status}
                        </span>
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
