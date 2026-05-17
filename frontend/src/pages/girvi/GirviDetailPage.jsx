import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { parseApiError } from "../../utils/apiError";
import PageLoader from "../../components/ui/PageLoader";

/* ── Formatters ── */
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n ?? 0);
const fmtMoney = (n) => `₹${fmt(n)}`;
const fmtDate = (s) =>
  s
    ? new Date(s).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const fmtDT = (s) =>
  s
    ? new Date(s).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const daysBetween = (from) =>
  from
    ? Math.max(0, Math.floor((new Date() - new Date(from)) / 86400000))
    : 0;

/* ── Collect Interest inline form ── */
function CollectForm({ loan, onDone }) {
  const principal = parseFloat(loan.principal_amount) || 0;
  const rate = parseFloat(loan.interest_rate_per_month) || 0;
  const monthly = parseFloat(((principal * rate) / 100).toFixed(2));
  const outstanding = parseFloat(loan.outstanding_interest ?? 0);

  const CHIPS = [
    { label: "Monthly", value: monthly },
    { label: "Outstanding", value: outstanding },
    { label: "3 Months", value: parseFloat((monthly * 3).toFixed(2)) },
  ].filter((c) => c.value > 0);

  const [amount, setAmount] = useState(String(monthly));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pay = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      setErr("Enter a valid amount");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/girvi/${loan.id}/interest`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ amount: val, notes: note || null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(parseApiError(d, "Failed to record interest payment. Please try again."));
      }
      setAmount(String(monthly));
      setNote("");
      onDone(`₹${fmt(val)} recorded`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Collect Interest
      </h3>

      {/* Quick-select chips */}
      <div className="flex gap-2 flex-wrap mb-4">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            onClick={() => setAmount(String(c.value))}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              parseFloat(amount) === c.value
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
            }`}
          >
            {c.label} — {fmtMoney(c.value)}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="flex gap-3 items-start flex-wrap">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            ₹
          </span>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1 min-w-[10rem] focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={pay}
          disabled={busy}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
        >
          {busy ? "Saving…" : "Pay"}
        </button>
      </div>
      {err && <p className="text-red-500 text-xs mt-2">{err}</p>}
    </div>
  );
}

/* ── Close loan section ── */
function CloseSection({ loan, onDone }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const closeLoan = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/girvi/${loan.id}/close`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(parseApiError(d, "Failed to close loan. Please try again."));
      }
      onDone("Loan closed — jewellery returned");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-6 text-xs text-gray-400 hover:text-red-500 underline"
      >
        Close this loan (jewellery returned)
      </button>
    );
  }

  return (
    <div className="mt-6 border border-red-200 rounded-xl p-4 bg-red-50">
      <p className="text-sm font-semibold text-red-700 mb-1">
        Close this loan?
      </p>
      <p className="text-xs text-red-600 mb-3">
        This marks the loan as repaid. Jewellery will be returned to customer.
        Cannot be undone.
      </p>
      {err && <p className="text-xs text-red-700 mb-2">{err}</p>}
      <div className="flex gap-3">
        <button
          onClick={closeLoan}
          disabled={busy}
          className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg disabled:opacity-50"
        >
          {busy ? "Closing…" : "Yes, close loan"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function GirviDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/girvi/${id}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(parseApiError(d, "Failed to load loan details. Please try again."));
      }
      setLoan(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDone = (msg) => {
    setToast(msg);
    load();
    setTimeout(() => setToast(""), 4000);
  };

  if (loading)
    return <PageLoader />;

  if (error || !loan)
    return (
      <ShopLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <p className="text-3xl">💍</p>
          <p className="text-gray-500 font-semibold">{error || "Loan not found"}</p>
          <button
            onClick={() => navigate("/girvi")}
            className="text-indigo-600 text-sm hover:underline"
          >
            ← Back to loans
          </button>
        </div>
      </ShopLayout>
    );

  const isActive = loan.status === "active";
  const payments = loan.interest_payments ?? [];
  const photos = loan.photos ?? [];
  const principal = parseFloat(loan.principal_amount) || 0;
  const rate = parseFloat(loan.interest_rate_per_month) || 0;
  const monthly = (principal * rate) / 100;
  const days = daysBetween(loan.start_date);
  const ageStr =
    days < 30
      ? `${days}d`
      : days < 365
      ? `${Math.floor(days / 30)}m ${days % 30}d`
      : `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}m`;
  const ageCls =
    days >= 180
      ? "bg-red-100 text-red-700"
      : days >= 90
      ? "bg-yellow-100 text-yellow-700"
      : "bg-green-100 text-green-700";
  const totalPaid = parseFloat(loan.total_interest_paid) || 0;
  const outstanding = parseFloat(loan.outstanding_interest ?? 0);

  return (
    <ShopLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back */}
        <button
          onClick={() => navigate("/girvi")}
          className="mb-4 text-sm text-gray-500 hover:text-indigo-600"
        >
          ← All Loans
        </button>

        {/* Toast */}
        {toast && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm font-semibold rounded-xl px-4 py-3">
            ✅ {toast}
          </div>
        )}

        {/* ── Header card ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          {/* Customer row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
              {(loan.customer_name ?? "?")[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{loan.customer_name}</p>
              <p className="text-xs text-gray-500">{loan.customer_phone ?? "—"}</p>
            </div>
            <span
              className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${
                isActive
                  ? "bg-green-100 text-green-700"
                  : loan.status === "overdue"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {(loan.status ?? "").toUpperCase()}
            </span>
          </div>

          {/* 3 KPI tiles */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Principal", value: fmtMoney(principal) },
              { label: "Monthly Interest", value: fmtMoney(monthly) },
              {
                label: "Outstanding",
                value: fmtMoney(outstanding || Math.max(0, totalPaid === 0 ? monthly : 0)),
                highlight: outstanding > 0,
              },
            ].map((k) => (
              <div
                key={k.label}
                className={`rounded-lg p-3 text-center ${
                  k.highlight
                    ? "bg-red-50 border border-red-200"
                    : "bg-gray-50"
                }`}
              >
                <p
                  className={`text-lg font-bold ${
                    k.highlight ? "text-red-600" : "text-gray-900"
                  }`}
                >
                  {k.value}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
            <span>Loan #{loan.id}</span>
            <span>{rate}% / month</span>
            <span>Since {fmtDate(loan.start_date)}</span>
            <span className={`font-medium px-1.5 py-0.5 rounded ${ageCls}`}>
              {ageStr}
            </span>
          </div>

          {/* Jewellery / notes */}
          {(loan.jewelry_description || loan.notes) && (
            <div className="border-t border-gray-100 pt-3 text-xs text-gray-600 space-y-1">
              {loan.jewelry_description && (
                <p>
                  <span className="font-medium text-gray-700">💍 </span>
                  {loan.jewelry_description}
                  {loan.gross_weight
                    ? ` · ${loan.gross_weight}g${loan.purity ? ` · ${loan.purity}K` : ""}`
                    : ""}
                </p>
              )}
              {loan.notes && (
                <p>
                  <span className="font-medium text-gray-700">📝 </span>
                  {loan.notes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Collect interest (active only) ── */}
        {isActive && <CollectForm loan={loan} onDone={handleDone} />}

        {/* ── Payment history ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Payments Received
            {payments.length > 0 && (
              <span className="ml-2 text-xs text-gray-400 font-normal">
                {payments.length} payment{payments.length > 1 ? "s" : ""} ·{" "}
                {fmtMoney(totalPaid)} total
              </span>
            )}
          </h3>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-400">No payments recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left py-1.5 font-medium">Date</th>
                  <th className="text-left py-1.5 font-medium">Month</th>
                  <th className="text-right py-1.5 font-medium">Amount</th>
                  <th className="text-left py-1.5 pl-4 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="py-2 text-gray-700 text-xs">
                      {fmtDT(p.created_at)}
                    </td>
                    <td className="py-2 text-gray-500 text-xs">
                      {p.for_month ?? "—"}
                    </td>
                    <td className="py-2 text-right font-semibold text-green-700">
                      {fmtMoney(p.amount)}
                    </td>
                    <td className="py-2 pl-4 text-gray-400 text-xs">
                      {p.notes ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td
                    colSpan={2}
                    className="pt-2 text-xs font-semibold text-gray-600"
                  >
                    Total paid
                  </td>
                  <td className="pt-2 text-right font-bold text-green-700">
                    {fmtMoney(totalPaid)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* ── Photos ── */}
        {photos.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Photos</h3>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <a
                  key={p.id}
                  href={`${API_BASE}${p.image_url}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={`${API_BASE}${p.image_url}`}
                    alt="Jewellery"
                    className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Close loan (active only) ── */}
        {isActive && (
          <CloseSection loan={loan} onDone={() => navigate("/girvi")} />
        )}
      </div>
    </ShopLayout>
  );
}
