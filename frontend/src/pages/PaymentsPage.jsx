import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ShopLayout from "../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../api";
import { parseApiError } from "../utils/apiError";
import { Spinner } from "../components/ui/Spinner";

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtMoney = (n) => `₹${fmt(n)}`;
const fmtDate = (s) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDT = (s) =>
  s ? new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

function daysOld(dateStr) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000);
}
const ageLabel = (d) =>
  d < 30 ? `${d}d` : d < 365 ? `${Math.floor(d / 30)}m ${d % 30}d` : `${Math.floor(d / 365)}y`;
const ageBadgeCls = (d) =>
  d >= 60
    ? "bg-red-100 text-red-700 border border-red-200"
    : d >= 20
    ? "bg-amber-100 text-amber-700 border border-amber-200"
    : "bg-green-100 text-green-700 border border-green-200";

// ── Reminder Modal ─────────────────────────────────────────────────────────
function ReminderModal({ customer, onClose, onSent }) {
  const [channel, setChannel] = useState("whatsapp");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setDone(false);
    setChannel("whatsapp");
    const bills = customer.bills ? customer.bills.length : 1;
    setMessage(
      `Namaste ${customer.customerName},\n\nYour payment of ${fmtMoney(customer.totalDue)} is pending` +
        ` (${bills} bill${bills > 1 ? "s" : ""}).\n\nPlease visit us at your earliest convenience.\n\nThank you,\nKC Jewellers`
    );
  }, [customer]);

  if (!customer) return null;

  const handleWhatsApp = () => {
    const rawPhone = customer.phone || customer.primary_phone || customer.customerPhone || "";
    const phone = rawPhone.replace(/\D/g, "");
    if (!phone) {
      alert("No phone number on record for this customer. Please update their profile.");
      return;
    }
    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    setDone(true);
    setTimeout(() => { onSent && onSent(); onClose(); }, 1500);
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const url = customer.customerId
        ? `${API_BASE}/api/reminders/send?customer_id=${customer.customerId}`
        : `${API_BASE}/api/reminders/send`;
      const res = await fetch(url, { method: "POST", headers: authHeaders() });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(parseApiError(d, "Could not send reminder."));
      }
      setDone(true);
      setTimeout(() => { onSent && onSent(); onClose(); }, 1500);
    } catch {
      alert("Could not send reminder. Check channel configuration in Settings.");
    } finally {
      setSending(false);
    }
  };

  const channels = [
    { id: "whatsapp", label: "💬 WhatsApp", sub: "No setup needed" },
    { id: "sms",      label: "📱 SMS",      sub: "Needs Twilio" },
    { id: "push",     label: "🔔 App Push", sub: "Needs Firebase" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl mx-4 mb-4 sm:mb-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-gray-900 text-base">{customer.customerName}</p>
            <p className="text-sm font-semibold text-red-500 mt-0.5">{fmtMoney(customer.totalDue)} pending</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 text-2xl font-light transition-colors">
            ×
          </button>
        </div>

        {done ? (
          <div className="px-5 py-12 text-center">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-bold text-gray-800 text-base">Reminder sent!</p>
            <p className="text-sm text-gray-400 mt-1">{customer.customerName} will be notified.</p>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">

            {/* Channel selector */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Send via</p>
              <div className="flex gap-2">
                {channels.map((c) => (
                  <button key={c.id} onClick={() => setChannel(c.id)}
                    className={`flex-1 py-2.5 px-2 rounded-xl border text-center transition-all ${
                      channel === c.id
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "border-gray-200 text-gray-600 hover:border-blue-300 bg-white"}`}>
                    <p className="text-sm font-semibold">{c.label}</p>
                    <p className={`text-[10px] mt-0.5 ${channel === c.id ? "text-blue-100" : "text-gray-400"}`}>{c.sub}</p>
                  </button>
                ))}
              </div>
              {channel === "whatsapp" && (
                <p className="text-[11px] text-green-600 font-semibold mt-1.5">
                  ✓ Recommended — opens WhatsApp on your device, no configuration needed
                </p>
              )}
            </div>

            {/* Message editor */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Message preview</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none bg-gray-50" />
              <p className="text-[11px] text-gray-400 mt-1">You can edit the message before sending</p>
            </div>

            {/* Bills list (multi-bill customers) */}
            {customer.bills && customer.bills.length > 1 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 space-y-1">
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">Bills due</p>
                {customer.bills.map((b) => (
                  <div key={b.id} className="flex justify-between text-xs text-amber-800">
                    <span>Bill #{b.id} · {fmtDate(b.date)}</span>
                    <span className="font-bold">{fmtMoney(b.dueAmount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action */}
            {channel === "whatsapp" ? (
              <button onClick={handleWhatsApp}
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm shadow-sm transition-colors">
                💬 Open WhatsApp &amp; Send
              </button>
            ) : (
              <button onClick={handleSend} disabled={sending}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors disabled:opacity-50">
                {sending ? "Sending…" : "Send Reminder"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inline Pay Panel ───────────────────────────────────────────────────────
function PayPanel({ row, onSuccess, onCancel }) {
  const [amount, setAmount] = useState(String(Math.round(row.dueAmount || 0)));
  const [mode, setMode]     = useState("Cash");
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState("");
  const [done, setDone]     = useState(null);
  const val = parseFloat(amount) || 0;

  async function submit() {
    if (!val || val <= 0) return setErr("Enter an amount greater than ₹0");
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/transactions/${row.id}/record-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ amount: val, payment_mode: mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseApiError(data, "Failed to record payment. Please try again."));
      setDone({ amount: val, mode, remaining: Math.max(0, (row.dueAmount || 0) - val) });
      setTimeout(() => onSuccess(), 2500);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="mt-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2 flex items-center gap-2">
        <span className="text-green-600 text-sm">✓</span>
        <span className="text-sm font-semibold text-green-800">{fmtMoney(done.amount)} via {done.mode}</span>
        <span className="text-xs text-gray-400 ml-1">
          {done.remaining > 0 ? `· ${fmtMoney(done.remaining)} remaining` : "· Fully cleared"}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 pt-3 border-t border-gray-100 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setAmount(String(Math.round(row.dueAmount || 0)))}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
            Math.abs(val - Math.round(row.dueAmount || 0)) < 1
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-400"}`}>
          Full — {fmtMoney(row.dueAmount)}
        </button>
        {row.dueAmount >= 2000 && (
          <button onClick={() => setAmount(String(Math.round(row.dueAmount / 2)))}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
              Math.abs(val - Math.round(row.dueAmount / 2)) < 1
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-400"}`}>
            Half — {fmtMoney(row.dueAmount / 2)}
          </button>
        )}
      </div>
      <div className="flex gap-1.5 flex-wrap items-center">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="pl-6 pr-2 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold w-28 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white" />
        </div>
        {["Cash", "UPI", "Card", "Bank"].map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              mode === m
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-50 text-gray-500 border-gray-200 hover:border-blue-400"}`}>
            {m}
          </button>
        ))}
        <button onClick={submit} disabled={loading || val <= 0}
          className="px-4 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 disabled:opacity-40 shadow-sm transition-colors whitespace-nowrap">
          {loading ? "Saving…" : `Record ${fmtMoney(val)}`}
        </button>
        <button onClick={onCancel}
          className="px-3 py-1.5 text-gray-400 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  );
}

// ── Outstanding Tab ────────────────────────────────────────────────────────
function OutstandingTab({ items, loading, onRefresh }) {
  const navigate = useNavigate();
  const [openId, setOpenId]           = useState(null);
  const [search, setSearch]           = useState("");
  const [reminderFor, setReminderFor] = useState(null);
  const [remindingAll, setRemindingAll] = useState(false);
  const [toast, setToast]             = useState(null);

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const totalDue   = (items || []).reduce((s, r) => s + (r.dueAmount || 0), 0);
  const totalCount = (items || []).length;

  const byCustomer = (items || [])
    .filter((r) => !search || r.customerName?.toLowerCase().includes(search.toLowerCase()))
    .reduce((acc, row) => {
      const key = row.customerId;
      if (!acc[key]) acc[key] = { customerId: row.customerId, customerName: row.customerName, bills: [] };
      acc[key].bills.push(row);
      return acc;
    }, {});

  const customers = Object.values(byCustomer).map((c) => ({
    ...c,
    totalDue:   c.bills.reduce((s, b) => s + (b.dueAmount || 0), 0),
    oldestDate: c.bills.reduce((old, b) => (!old || b.date < old ? b.date : old), null),
  })).sort((a, b) => daysOld(b.oldestDate) - daysOld(a.oldestDate));

  async function remindAll() {
    setRemindingAll(true);
    try {
      const res = await fetch(`${API_BASE}/api/reminders/send`, { method: "POST", headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseApiError(data, "Failed to send reminders. Please try again."));
      const count = data.sent != null ? data.sent : data.customers_notified != null ? data.customers_notified : customers.length;
      showToast(`✓ Reminders sent to ${count} customer${count !== 1 ? "s" : ""}`);
    } catch (e) {
      showToast(`Could not send reminders: ${e.message}`, "err");
    } finally {
      setRemindingAll(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
          toast.type === "err"
            ? "bg-red-50 border border-red-200 text-red-700"
            : "bg-green-50 border border-green-200 text-green-800"}`}>
          {toast.type === "err" ? "⚠️" : "✓"} {toast.msg}
        </div>
      )}

      {/* Summary + Remind All */}
      {!loading && totalCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-3">
          <div className="grid grid-cols-3 gap-3 flex-1">
            {[
              { label: "Total Outstanding",   value: fmtMoney(totalDue),  color: "text-blue-700" },
              { label: "Bills Pending",        value: totalCount,           color: "text-gray-900" },
              { label: "Customers with Dues",  value: customers.length,    color: "text-gray-900" },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{c.label}</p>
                <p className={`text-xl font-extrabold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>
          <button
            onClick={remindAll}
            disabled={remindingAll}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white rounded-2xl border border-amber-200 text-amber-700 text-sm font-bold hover:bg-amber-50 transition-all disabled:opacity-50 shadow-sm whitespace-nowrap">
            {remindingAll
              ? <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin inline-block" />
              : "🔔"}
            {remindingAll ? "Sending…" : `Remind All (${customers.length})`}
          </button>
        </div>
      )}

      {/* Search */}
      {totalCount > 0 && (
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
          <input type="text" placeholder="Search customer…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white" />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">✕</button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" center />
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl mb-3">✓</p>
            <p className="text-gray-600 font-semibold">
              {search ? `No results for "${search}"` : "All dues cleared"}
            </p>
            {search && (
              <button onClick={() => setSearch("")} className="mt-2 text-sm text-blue-600 hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Customer", "Oldest Bill", "Due Amount", ""].map((h) => (
                  <th key={h} className={`px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap ${
                    h === "Due Amount" ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((c) => {
                const days = daysOld(c.oldestDate);
                const isOpen = openId === c.customerId;
                const collectRow = c.bills.length === 1
                  ? c.bills[0]
                  : { ...c.bills[0], dueAmount: c.totalDue };
                return (
                  <React.Fragment key={c.customerId}>
                    <tr className={`hover:bg-blue-50/30 transition-colors ${isOpen ? "bg-blue-50/20" : ""}`}>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">
                            {(c.customerName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm cursor-pointer hover:text-blue-600"
                              onClick={() => navigate(`/customer/${c.customerId}`)}>
                              {c.customerName}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {c.bills.length === 1
                                ? `Bill #${c.bills[0].id} · ${fmtDate(c.bills[0].date)}`
                                : `${c.bills.length} bills · #${c.bills.map((b) => b.id).join(", #")}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Age */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${ageBadgeCls(days)}`}>
                          {ageLabel(days)}{days >= 60 ? " ⚠️" : ""}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right">
                        <p className="font-extrabold text-gray-900 text-sm">{fmtMoney(c.totalDue)}</p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setReminderFor(c)}
                            title="Send payment reminder"
                            className="w-8 h-8 flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors text-sm">
                            🔔
                          </button>
                          <button
                            onClick={() => setOpenId(isOpen ? null : c.customerId)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              isOpen
                                ? "bg-gray-100 text-gray-600 border-gray-200"
                                : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm"}`}>
                            {isOpen ? "Cancel" : "Collect"}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Inline pay panel */}
                    {isOpen && (
                      <tr className="bg-blue-50/10">
                        <td colSpan={4} className="px-6 pb-3">
                          <PayPanel
                            row={collectRow}
                            onSuccess={() => { setOpenId(null); onRefresh(); }}
                            onCancel={() => setOpenId(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Reminder Modal */}
      <ReminderModal
        customer={reminderFor}
        onClose={() => setReminderFor(null)}
        onSent={() => {
          showToast(`✓ Reminder sent to ${reminderFor ? reminderFor.customerName : ""}`);
          setReminderFor(null);
        }}
      />
    </div>
  );
}

// ── History Tab ────────────────────────────────────────────────────────────
function HistoryTab() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/payments/history`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = history.filter(
    (p) => !search || p.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  const thisMonth = history
    .filter((p) => {
      const d = new Date(p.createdAt), n = new Date();
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    })
    .reduce((s, p) => s + (p.amount || 0), 0);

  const totalCollected = history.reduce((s, p) => s + (p.amount || 0), 0);

  const modeColor = (m) => ({
    Cash: "bg-green-100 text-green-700 border border-green-200",
    UPI:  "bg-blue-100 text-blue-700 border border-blue-200",
    Card: "bg-purple-100 text-purple-700 border border-purple-200",
  }[m] || "bg-gray-100 text-gray-600 border border-gray-200");

  return (
    <div className="space-y-5">
      {!loading && history.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Collected This Month", value: fmtMoney(thisMonth),     color: "text-blue-700" },
            { label: "All-Time Collected",   value: fmtMoney(totalCollected), color: "text-gray-900" },
            { label: "Total Payments",       value: history.length,           color: "text-gray-900" },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{c.label}</p>
              <p className={`text-xl font-extrabold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="relative max-w-xs">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
        <input type="text" placeholder="Search customer…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white" />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">✕</button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" center />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500 font-semibold">
              {search ? `No results for "${search}"` : "No payment history yet"}
            </p>
            {search && (
              <button onClick={() => setSearch("")} className="mt-2 text-sm text-blue-600 hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Date", "Customer", "Bill #", "Amount", "Mode"].map((h) => (
                  <th key={h} className={`px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap ${
                    h === "Amount" ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-500">{fmtDT(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                        {(p.customerName || "?").charAt(0).toUpperCase()}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{p.customerName}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">#{p.transactionId}</td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-extrabold text-blue-700 text-sm">{fmtMoney(p.amount)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${modeColor(p.paymentMode)}`}>
                      {p.paymentMode || "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "outstanding";
  const [activeTab, setActiveTab] = useState(
    ["outstanding", "history"].includes(tabFromUrl) ? tabFromUrl : "outstanding"
  );
  const [outstanding, setOutstanding]               = useState([]);
  const [loadingOutstanding, setLoadingOutstanding] = useState(true);

  const loadOutstanding = useCallback(() => {
    setLoadingOutstanding(true);
    fetch(`${API_BASE}/api/payments/outstanding`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setOutstanding(d.items || []))
      .catch(() => setOutstanding([]))
      .finally(() => setLoadingOutstanding(false));
  }, []);

  useEffect(() => { loadOutstanding(); }, [loadOutstanding]);

  const switchTab = (id) => {
    setActiveTab(id);
    setSearchParams(id === "outstanding" ? {} : { tab: id });
  };

  return (
    <ShopLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Billing</p>
          <h1 className="text-2xl font-extrabold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-400 mt-0.5">Collect dues · send reminders · view history</p>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {[
            { id: "outstanding", label: "Outstanding" },
            { id: "history",     label: "History" },
          ].map((t) => (
            <button key={t.id} onClick={() => switchTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === t.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "outstanding" && (
          <OutstandingTab
            items={outstanding}
            loading={loadingOutstanding}
            onRefresh={loadOutstanding}
          />
        )}
        {activeTab === "history" && <HistoryTab />}
      </div>
    </ShopLayout>
  );
}
