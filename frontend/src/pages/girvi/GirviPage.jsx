import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { Spinner } from "../../components/ui/Spinner";

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (s) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const calcLoan = (loan) => {
  const ms = Math.max(0, new Date() - new Date(loan.start_date));
  const days = Math.floor(ms / 86400000);
  const months = ms / (86400000 * 30.44);
  const interestAccrued = loan.principal_amount * (loan.interest_rate_per_month / 100) * months;
  return { days, months, interestAccrued, totalDue: loan.principal_amount + interestAccrued };
};

const ageLabel = (d) => {
  if (d < 30) return `${d}d`;
  if (d < 365) return `${Math.floor(d / 30)}m ${d % 30}d`;
  return `${Math.floor(d / 365)}y ${Math.floor((d % 365) / 30)}m`;
};
const ageBadgeCls = (d) =>
  d >= 180 ? "bg-red-100 text-red-700 border border-red-200"
  : d >= 90 ? "bg-amber-100 text-amber-700 border border-amber-200"
  : "bg-green-100 text-green-700 border border-green-200";

const TABS = [
  { key: "active",  label: "Active"  },
  { key: "overdue", label: "Overdue" },
  { key: "closed",  label: "Closed"  },
];

export default function GirviPage() {
  const navigate = useNavigate();
  const [allLoans, setAllLoans] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("active");
  const [search, setSearch]     = useState("");

  const fetchLoans = useCallback(async (statusParam) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/girvi?status=${statusParam}`, { headers: authHeaders() });
      setAllLoans(res.ok ? await res.json() : []);
    } catch { setAllLoans([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchLoans(tab === "overdue" ? "active" : tab);
  }, [tab, fetchLoans]);

  const enriched = allLoans.map((l) => ({ ...l, ...calcLoan(l) }));
  const tabFiltered = tab === "overdue" ? enriched.filter((l) => l.days >= 180) : enriched;
  const displayed = search.trim()
    ? tabFiltered.filter((l) => (l.customer_name || "").toLowerCase().includes(search.trim().toLowerCase()))
    : tabFiltered;

  const summarySet = tab !== "closed" ? tabFiltered : [];
  const totalPrincipal = summarySet.reduce((s, l) => s + l.principal_amount, 0);
  const totalInterest  = summarySet.reduce((s, l) => s + l.interestAccrued, 0);
  const overdueCount   = enriched.filter((l) => l.days >= 180).length;

  return (
    <ShopLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Girvi</p>
            <h1 className="text-2xl font-extrabold text-gray-900">Loans</h1>
          </div>
          <Link to="/girvi/new"
            className="shrink-0 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm transition-colors">
            + New Girvi
          </Link>
        </div>

        {/* Summary cards */}
        {!loading && summarySet.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: tab === "overdue" ? "Overdue Loans" : "Active Loans",
                value: summarySet.length, color: tab === "overdue" ? "text-red-700" : "text-gray-900" },
              { label: "Total Principal", value: `₹${fmt(totalPrincipal)}`, color: "text-blue-700" },
              { label: "Interest Accrued", value: `₹${fmt(totalInterest)}`, color: "text-amber-700", sub: "as of today" },
              { label: "Total Exposure", value: `₹${fmt(totalPrincipal + totalInterest)}`, color: "text-gray-900",
                sub: overdueCount > 0 ? `${overdueCount} overdue` : null, subColor: "text-red-500" },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{c.label}</p>
                <p className={`text-xl font-extrabold ${c.color}`}>{c.value}</p>
                {c.sub && <p className={`text-xs mt-0.5 ${c.subColor || "text-gray-400"}`}>{c.sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => { setTab(key); setSearch(""); }}
                className={`relative px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}>
                {label}
                {key === "overdue" && overdueCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                    {overdueCount > 9 ? "9+" : overdueCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
            <input type="text" placeholder="Search customer…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white" />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">✕</button>
            )}
          </div>
          {search && (
            <p className="text-xs text-gray-400">{displayed.length} result{displayed.length !== 1 ? "s" : ""}</p>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" center />
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">💍</p>
              {search ? (
                <>
                  <p className="text-gray-600 font-semibold">No results for "{search}"</p>
                  <button onClick={() => setSearch("")} className="mt-2 text-sm text-blue-600 hover:underline">Clear search</button>
                </>
              ) : tab === "overdue" ? (
                <p className="text-gray-500 font-semibold">No overdue loans 🎉</p>
              ) : (
                <>
                  <p className="text-gray-500 font-semibold">No {tab} loans</p>
                  {tab === "active" && (
                    <Link to="/girvi/new" className="mt-3 inline-block text-sm text-blue-600 font-semibold hover:underline">
                      Create your first Girvi →
                    </Link>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Customer", "Jewellery", "Principal", "Monthly ₹", "Age", "Interest Accrued", "Total Due", ""].map((h) => (
                      <th key={h} className={`px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap ${
                        ["Principal","Monthly ₹","Interest Accrued","Total Due"].includes(h) ? "text-right" : "text-left"
                      }`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayed.map((loan) => (
                    <tr key={loan.id}
                      className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/girvi/${loan.id}`)}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 text-sm">{loan.customer_name}</p>
                        <p className="text-xs text-gray-400">Loan #{loan.id}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <p className="text-sm text-gray-700 truncate">{loan.jewelry_description}</p>
                        {loan.gross_weight && (
                          <p className="text-xs text-gray-400">{loan.gross_weight}g{loan.purity ? ` · ${loan.purity}K` : ""}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-gray-900 text-sm">₹{fmt(loan.principal_amount)}</p>
                        <p className="text-xs text-gray-400">{loan.interest_rate_per_month}%/mo</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm text-gray-700">₹{fmt(loan.principal_amount * loan.interest_rate_per_month / 100)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {tab === "closed"
                          ? <span className="text-sm text-gray-400">{fmtDate(loan.closed_at)}</span>
                          : <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${ageBadgeCls(loan.days)}`}>
                              {ageLabel(loan.days)}{loan.days >= 180 ? " ⚠️" : ""}
                            </span>}
                        <p className="text-[10px] text-gray-400 mt-0.5">from {fmtDate(loan.start_date)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className={`font-semibold text-sm ${tab !== "closed" ? "text-amber-700" : "text-gray-400"}`}>
                          {tab !== "closed" ? `₹${fmt(loan.interestAccrued)}` : "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-bold text-gray-900 text-sm">
                          {tab !== "closed" ? `₹${fmt(loan.totalDue)}` : `₹${fmt(loan.principal_amount)}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xl">›</td>
                    </tr>
                  ))}
                </tbody>
                {search && displayed.length > 1 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td colSpan={2} className="px-4 py-2 text-xs font-bold text-gray-400">{displayed.length} loans</td>
                      <td className="px-4 py-2 text-xs font-bold text-gray-700 text-right">₹{fmt(displayed.reduce((s,l)=>s+l.principal_amount,0))}</td>
                      <td colSpan={3} />
                      <td className="px-4 py-2 text-xs font-bold text-gray-700 text-right">₹{fmt(displayed.reduce((s,l)=>s+l.totalDue,0))}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </ShopLayout>
  );
}
