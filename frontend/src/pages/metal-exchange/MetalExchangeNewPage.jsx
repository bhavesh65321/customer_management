import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import CustomerSelectWithAdd from "../../components/ui/CustomerSelectWithAdd";
import { API_BASE, authHeaders } from "../../api";
import InlineError from "../../components/ui/InlineError";

/* ── Helpers ── */
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(n ?? 0);
const fmtMoney = (n) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n ?? 0)}`;

const EXCHANGE_TYPES = [
  {
    value: "raw_to_cash",
    label: "Old Jewellery → Cash",
    emoji: "💰",
    desc: "Customer gives old gold/silver, gets cash",
    needs: ["weight", "purity", "rate", "making_charges"],
    gives: "cash",
  },
  {
    value: "raw_to_pure",
    label: "Old Jewellery → Pure Gold",
    emoji: "🔄",
    desc: "Customer gives old jewellery, gets pure gold bar/coin",
    needs: ["weight", "purity", "rate", "making_charges"],
    gives: "pure_metal",
  },
  {
    value: "advance_metal",
    label: "Keep Metal as Advance",
    emoji: "🏦",
    desc: "Customer gives metal now, to be used against a future jewellery purchase",
    needs: ["weight", "purity", "rate"],
    gives: "advance",
  },
  {
    value: "advance_money",
    label: "Cash Advance for Future Purchase",
    emoji: "📋",
    desc: "Customer deposits money with shop for a future jewellery order",
    needs: ["cash_only"],
    gives: "advance_cash",
  },
];

export default function MetalExchangeNewPage() {
  const navigate = useNavigate();

  /* Live rates from server */
  const [rates, setRates] = useState({ gold: null, silver: null });

  /* Form state */
  const [customerId, setCustomerId] = useState("");
  const [exchangeType, setExchangeType] = useState("raw_to_cash");
  const [metalType, setMetalType] = useState("gold");
  const [rawWeight, setRawWeight] = useState("");
  const [customPct, setCustomPct] = useState("");
  const [ratePerGram, setRatePerGram] = useState(""); // editable, pre-filled from server
  const [makingCharges, setMakingCharges] = useState("");
  const [cashAmount, setCashAmount] = useState(""); // for advance_money
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  /* Fetch today's rates */
  useEffect(() => {
    fetch(`${API_BASE}/api/metal-rates/current`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) => {
        const map = {};
        (arr || []).forEach((r) => (map[r.metal_type] = r.rate_per_unit));
        setRates(map);
      })
      .catch(() => {});
  }, []);

  /* Auto-fill rate when metal type changes */
  useEffect(() => {
    if (rates[metalType]) setRatePerGram(String(Math.round(rates[metalType])));
  }, [metalType, rates]);

  /* Computed values */
  const selectedType = EXCHANGE_TYPES.find((t) => t.value === exchangeType);
  const isCashOnly = selectedType?.needs?.includes("cash_only");

  const purityPct = useMemo(() => {
    return parseFloat(customPct) || 0;
  }, [customPct]);

  const calc = useMemo(() => {
    const w = parseFloat(rawWeight) || 0;
    const rate = parseFloat(ratePerGram) || 0;
    const mc = parseFloat(makingCharges) || 0;
    const pureGrams = parseFloat(((w * purityPct) / 100).toFixed(3));
    const grossValue = parseFloat((pureGrams * rate).toFixed(2));
    const netCash = Math.max(0, grossValue - mc);
    // Pure gold given back = pure grams - (making charges worth in grams)
    const mcGrams = rate > 0 ? parseFloat((mc / rate).toFixed(3)) : 0;
    const pureGivenBack = Math.max(0, parseFloat((pureGrams - mcGrams).toFixed(3)));
    return { w, rate, mc, pureGrams, grossValue, netCash, mcGrams, pureGivenBack };
  }, [rawWeight, purityPct, ratePerGram, makingCharges]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!customerId) { setErr("Select a customer"); return; }
    if (!isCashOnly && !calc.w) { setErr("Enter the weight"); return; }
    if (isCashOnly && !parseFloat(cashAmount)) { setErr("Enter cash amount"); return; }
    setBusy(true);
    try {
      const payload = {
        customer_id: parseInt(customerId, 10),
        type: exchangeType,
        metal_type: metalType,
        raw_weight: isCashOnly ? null : calc.w,
        raw_purity: isCashOnly ? null : purityPct,
        pure_weight:
          exchangeType === "raw_to_pure"
            ? calc.pureGivenBack
            : exchangeType === "advance_metal"
            ? calc.pureGrams
            : null,
        cash_amount:
          exchangeType === "raw_to_cash"
            ? calc.netCash
            : exchangeType === "advance_money"
            ? parseFloat(cashAmount)
            : null,
        making_charges: calc.mc || null,
        rate_per_gram: parseFloat(ratePerGram) || null,
        notes: notes || null,
      };
      const res = await fetch(`${API_BASE}/api/metal-exchange`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to save");
      }
      navigate("/metal-exchange");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ShopLayout>
      <div className="max-w-xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate("/metal-exchange")}
          className="mb-4 text-sm text-gray-500 hover:text-indigo-600"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold text-gray-900 mb-6">New Metal Exchange</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {err && (
            <InlineError message={err} onDismiss={() => setErr("")} />
          )}

          {/* ── Customer ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <CustomerSelectWithAdd
              id="me-customer"
              value={customerId}
              onChange={setCustomerId}
              required
              label="Customer *"
            />
          </div>

          {/* ── Exchange Type ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              What does the customer want to do?
            </p>
            <div className="space-y-2">
              {EXCHANGE_TYPES.map((t) => (
                <label
                  key={t.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    exchangeType === t.value
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="exchange_type"
                    value={t.value}
                    checked={exchangeType === t.value}
                    onChange={() => setExchangeType(t.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {t.emoji} {t.label}
                    </p>
                    <p className="text-xs text-gray-500">{t.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ── Cash-only advance ── */}
          {isCashOnly ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Advance Amount
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              {cashAmount && parseFloat(cashAmount) > 0 && (
                <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm">
                  <p className="font-semibold text-blue-800">
                    📋 Advance credited: {fmtMoney(parseFloat(cashAmount))}
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    This amount will show in the customer's advance balance and can be
                    used against future jewellery purchases.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ── Metal details ── */
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  What the customer is bringing
                </p>

                {/* Metal type */}
                <div className="flex gap-3 mb-4">
                  {["gold", "silver"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMetalType(m)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        metalType === m
                          ? "bg-yellow-500 text-white border-yellow-500"
                          : "bg-white text-gray-700 border-gray-300 hover:border-yellow-400"
                      }`}
                    >
                      {m === "gold" ? "🥇 Gold" : "🥈 Silver"}
                    </button>
                  ))}
                </div>

                {/* Weight */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Weight (grams) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={rawWeight}
                    onChange={(e) => setRawWeight(e.target.value)}
                    placeholder="e.g. 15.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                {/* Purity */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-600">
                      Purity (%) *
                    </label>
                    <details className="relative">
                      <summary className="text-xs text-indigo-500 cursor-pointer list-none hover:underline">
                        Reference ▾
                      </summary>
                      <div className="absolute right-0 top-5 z-10 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-xs text-gray-700 w-44">
                        <p className="font-semibold text-gray-500 mb-1.5 uppercase tracking-wide text-[10px]">Common purities</p>
                        {[
                          { label: "24K", pct: "99.9" },
                          { label: "22K", pct: "91.6" },
                          { label: "18K", pct: "75.0" },
                          { label: "14K", pct: "58.3" },
                        ].map((p) => (
                          <div
                            key={p.label}
                            className="flex justify-between py-1 border-b border-gray-50 last:border-0 cursor-pointer hover:text-indigo-600"
                            onClick={() => setCustomPct(p.pct)}
                          >
                            <span className="font-semibold">{p.label}</span>
                            <span>{p.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={customPct}
                    onChange={(e) => setCustomPct(e.target.value)}
                    placeholder="e.g. 91.6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                {/* Pure gold equivalent */}
                {calc.w > 0 && purityPct > 0 && (
                  <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-2.5 text-xs text-yellow-800 mb-4">
                    <span className="font-semibold">Pure gold equivalent: </span>
                    {fmt(calc.pureGrams)}g
                    <span className="text-yellow-600 ml-1">
                      ({fmt(calc.w)}g × {purityPct.toFixed(2)}%)
                    </span>
                  </div>
                )}

                {/* Rate */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Today's Rate (₹ per gram, 24K){" "}
                    {rates[metalType] && (
                      <span className="text-indigo-500 font-normal">
                        — Today: {fmtMoney(rates[metalType])}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={ratePerGram}
                      onChange={(e) => setRatePerGram(e.target.value)}
                      placeholder="e.g. 7500"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Manager can override this rate if needed
                  </p>
                </div>

                {/* Making charges */}
                {(exchangeType === "raw_to_cash" || exchangeType === "raw_to_pure") && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Making / Melting Charges (₹){" "}
                      <span className="text-gray-400 font-normal">optional</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={makingCharges}
                        onChange={(e) => setMakingCharges(e.target.value)}
                        placeholder="0"
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Live Calculation Summary ── */}
              {calc.w > 0 && calc.rate > 0 && purityPct > 0 && (
                <div className="bg-gray-900 rounded-xl p-5 text-white">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                    Calculation Summary
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Weight brought</span>
                      <span className="font-semibold">{fmt(calc.w)}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Purity</span>
                      <span className="font-semibold">{purityPct.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pure gold equivalent</span>
                      <span className="font-semibold text-yellow-400">{fmt(calc.pureGrams)}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rate (24K)</span>
                      <span className="font-semibold">{fmtMoney(calc.rate)}/g</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-700 pt-2">
                      <span className="text-gray-400">Gross value</span>
                      <span className="font-bold text-white">{fmtMoney(calc.grossValue)}</span>
                    </div>
                    {calc.mc > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Making / melt charges</span>
                        <span className="text-red-400">− {fmtMoney(calc.mc)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-700 pt-2 text-base">
                      <span className="font-bold text-white">
                        {exchangeType === "raw_to_cash"
                          ? "Customer gets (cash)"
                          : exchangeType === "raw_to_pure"
                          ? "Pure gold to give back"
                          : "Advance balance added"}
                      </span>
                      <span className="font-extrabold text-green-400">
                        {exchangeType === "raw_to_pure"
                          ? `${fmt(calc.pureGivenBack)}g`
                          : fmtMoney(calc.netCash)}
                      </span>
                    </div>
                    {exchangeType === "advance_metal" && (
                      <p className="text-xs text-gray-400 mt-1">
                        {fmt(calc.pureGrams)}g pure gold stored as advance. Value at today's
                        rate: {fmtMoney(calc.grossValue)}. Actual value redeemed at the rate
                        on the day of purchase.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Notes <span className="text-gray-400 font-normal">optional</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 'Old bangle set', 'Cash via UPI'…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* ── Submit ── */}
          <div className="flex gap-3 pb-8">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm disabled:opacity-50"
            >
              {busy ? "Saving…" : "Record Exchange"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/metal-exchange")}
              className="px-5 py-3 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </ShopLayout>
  );
}
