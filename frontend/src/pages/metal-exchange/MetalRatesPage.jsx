import React, { useState, useEffect } from "react";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { parseApiError } from "../../utils/apiError";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n ?? 0);
const fmtMoney = (n) => `₹${fmt(n)}`;
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

const METALS = [
  {
    key: "gold",
    label: "Gold (24K)",
    icon: "🥇",
    color: "bg-yellow-50 border-yellow-200",
    textColor: "text-yellow-700",
    unit: "per gram",
  },
  {
    key: "silver",
    label: "Silver",
    icon: "🥈",
    color: "bg-gray-50 border-gray-200",
    textColor: "text-gray-700",
    unit: "per gram",
  },
];

export default function MetalRatesPage() {
  const [current, setCurrent] = useState({}); // { gold: 7500, silver: 95 }
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ gold: "", silver: "" });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const [cur, hist] = await Promise.all([
        fetch(`${API_BASE}/api/metal-rates/current`, { headers: authHeaders() }).then((r) =>
          r.ok ? r.json() : []
        ),
        fetch(`${API_BASE}/api/metal-rates`, { headers: authHeaders() }).then((r) =>
          r.ok ? r.json() : []
        ),
      ]);
      const map = {};
      (cur || []).forEach((r) => {
        map[r.metal_type] = r.rate_per_unit;
      });
      setCurrent(map);
      setHistory(hist || []);
    } catch {}
  };

  useEffect(() => {
    load();
  }, []);

  const saveRates = async () => {
    const entries = METALS.filter((m) => form[m.key] && parseFloat(form[m.key]) > 0);
    if (entries.length === 0) {
      setErr("Enter at least one rate");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      for (const m of entries) {
        const res = await fetch(`${API_BASE}/api/metal-rates`, {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            metal_type: m.key,
            rate_per_unit: parseFloat(form[m.key]),
            unit: "gram",
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(parseApiError(d, "Failed to save rate. Please try again."));
        }
      }
      setForm({ gold: "", silver: "" });
      setToast("Rates updated successfully");
      setTimeout(() => setToast(""), 4000);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ShopLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Today's Metal Rates</h1>
        <p className="text-sm text-gray-500 mb-6">
          Set daily gold &amp; silver rates. These auto-fill in billing and metal exchange.
        </p>

        {toast && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm font-semibold rounded-xl px-4 py-3">
            ✅ {toast}
          </div>
        )}

        {/* ── Current Rates ── */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {METALS.map((m) => (
            <div
              key={m.key}
              className={`rounded-xl border p-4 ${m.color}`}
            >
              <p className="text-xs text-gray-500 mb-1">
                {m.icon} {m.label}
              </p>
              <p className={`text-2xl font-extrabold ${m.textColor}`}>
                {current[m.key] ? fmtMoney(current[m.key]) : "—"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{m.unit}</p>
            </div>
          ))}
        </div>

        {/* ── Set New Rates ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Update Rates</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {METALS.map((m) => (
              <div key={m.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {m.icon} {m.label} (₹ / gram)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form[m.key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [m.key]: e.target.value }))
                    }
                    placeholder={current[m.key] ? String(Math.round(current[m.key])) : "0"}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Reference purity conversions */}
          {(form.gold && parseFloat(form.gold) > 0) && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3 mb-4 text-xs text-yellow-800">
              <p className="font-semibold mb-1">Gold rate reference (₹/gram)</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { k: "24K", factor: 1 },
                  { k: "22K", factor: 22 / 24 },
                  { k: "18K", factor: 18 / 24 },
                  { k: "14K", factor: 14 / 24 },
                ].map(({ k, factor }) => (
                  <div key={k}>
                    <span className="font-medium">{k}: </span>
                    {fmtMoney(parseFloat(form.gold) * factor)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {err && <p className="text-red-500 text-xs mb-3">{err}</p>}

          <button
            onClick={saveRates}
            disabled={busy}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            {busy ? "Saving…" : "Update Rates"}
          </button>
        </div>

        {/* ── Rate History ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Rate History</h2>
          </div>
          {history.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">No rates set yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-medium">Metal</th>
                  <th className="text-right px-4 py-2.5 font-medium">Rate (₹/g)</th>
                  <th className="text-right px-4 py-2.5 font-medium">Set on</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 20).map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 capitalize text-gray-700">
                      {r.metal_type === "gold" ? "🥇 Gold" : "🥈 Silver"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                      {fmtMoney(r.rate_per_unit)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-500">
                      {fmtDT(r.effective_from)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ShopLayout>
  );
}
