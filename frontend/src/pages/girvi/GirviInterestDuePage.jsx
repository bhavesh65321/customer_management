import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { parseApiError } from "../../utils/apiError";
import { Spinner } from "../../components/ui/Spinner";

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function GirviInterestDuePage() {
  const [list, setList]       = useState([]);
  const [loans, setLoans]     = useState([]);   // for customer name lookup
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId]       = useState(null);
  const [payAmount, setPayAmount]     = useState("");
  const [payLoading, setPayLoading]   = useState(false);
  const [payError, setPayError]       = useState("");

  useEffect(() => {
    // Fetch interest-due list + full loan list in parallel for customer names
    Promise.all([
      fetch(`${API_BASE}/api/girvi/interest-due`, { headers: authHeaders() })
        .then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/girvi?status=active`, { headers: authHeaders() })
        .then((r) => r.ok ? r.json() : []).catch(() => []),
    ]).then(([due, loanList]) => {
      setList(Array.isArray(due) ? due : []);
      setLoans(Array.isArray(loanList) ? loanList : []);
    }).finally(() => setLoading(false));
  }, []);

  const loanMap = Object.fromEntries(loans.map((l) => [l.id, l]));

  const handlePay = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { setPayError("Enter a valid amount"); return; }
    setPayLoading(true); setPayError("");
    try {
      const today = new Date().toISOString().slice(0, 7); // YYYY-MM
      const res = await fetch(`${API_BASE}/api/girvi/${payingId}/interest`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amount, for_month: today, notes: "Collected via Interest Due page" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(parseApiError(d, "Failed to record payment. Please try again."));
      }
      // Refresh list
      const updated = await fetch(`${API_BASE}/api/girvi/interest-due`, { headers: authHeaders() })
        .then((r) => r.ok ? r.json() : list);
      setList(Array.isArray(updated) ? updated : list);
      setPayingId(null); setPayAmount(""); setPayError("");
    } catch (e) { setPayError(e.message); }
    finally { setPayLoading(false); }
  };

  // Summary
  const totalOutstanding = list.reduce((s, r) => s + (r.interest_outstanding || 0), 0);
  const totalPaid        = list.reduce((s, r) => s + (r.total_interest_paid || 0), 0);
  const overdueRows      = list.filter((r) => r.months_elapsed >= 6);

  return (
    <>
    <ShopLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Girvi</p>
            <h1 className="text-2xl font-extrabold text-gray-900">Interest Due</h1>
          </div>
          <Link to="/girvi" className="text-sm font-semibold text-blue-600 hover:underline">← All Loans</Link>
        </div>

        {/* Summary cards */}
        {!loading && list.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Active Loans",       value: list.length,                color: "text-gray-900" },
              { label: "Interest Collected",  value: `₹${fmt(totalPaid)}`,       color: "text-green-700" },
              { label: "Outstanding Interest",value: `₹${fmt(totalOutstanding)}`, color: "text-amber-700",
                sub: overdueRows.length > 0 ? `${overdueRows.length} overdue (6m+)` : null },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{c.label}</p>
                <p className={`text-xl font-extrabold ${c.color}`}>{c.value}</p>
                {c.sub && <p className="text-xs text-red-500 mt-0.5">{c.sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" center />
            </div>
          ) : list.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-gray-500 font-semibold">No interest outstanding</p>
              <p className="text-gray-400 text-sm mt-1">All active loans are up to date.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Customer", "Principal", "Rate", "Months", "Total Interest", "Collected", "Outstanding", ""].map((h) => (
                      <th key={h} className={`px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap ${
                        ["Principal", "Rate", "Months", "Total Interest", "Collected", "Outstanding"].includes(h) ? "text-right" : "text-left"
                      }`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {list.map((row) => {
                    const loan = loanMap[row.loan_id];
                    const isOverdue = row.months_elapsed >= 6;
                    return (
                      <tr key={row.loan_id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 text-sm">
                            {loan?.customer_name || "—"}
                            {isOverdue && <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">OVERDUE</span>}
                          </p>
                          <p className="text-xs text-gray-400">Loan #{row.loan_id} · {loan?.jewelry_description?.slice(0, 28) || ""}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">₹{fmt(row.principal)}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500">{row.rate_per_month}%</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500">{row.months_elapsed}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700">₹{fmt(row.total_interest_due)}</td>
                        <td className="px-4 py-3 text-right text-sm text-green-700 font-medium">₹{fmt(row.total_interest_paid)}</td>
                        <td className="px-4 py-3 text-right">
                          <p className={`text-sm font-bold ${row.interest_outstanding > 0 ? "text-amber-700" : "text-green-600"}`}>
                            ₹{fmt(row.interest_outstanding)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {row.interest_outstanding > 0 && (
                            <button
                              type="button"
                              onClick={() => { setPayingId(row.loan_id); setPayAmount(row.interest_outstanding.toFixed(2)); setPayError(""); }}
                              className="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                            >
                              Collect
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Collect interest modal */}
      {payingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-2">Collect Interest</p>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {loanMap[payingId]?.customer_name || `Loan #${payingId}`}
            </h3>
            <p className="text-xs text-gray-400 mb-4">Loan #{payingId} · {loanMap[payingId]?.jewelry_description?.slice(0, 40) || ""}</p>

            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Amount Collected (₹)
            </label>
            <input
              type="number"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white mb-3"
              autoFocus
            />
            {payError && <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{payError}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setPayingId(null); setPayAmount(""); setPayError(""); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePay}
                disabled={payLoading}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {payLoading ? "Saving…" : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ShopLayout>
    </>
  );
}
