import React, { useState, useEffect, useCallback } from "react";
import api from "../../api";

// ── LoyaltyBadge ──────────────────────────────────────────────────────────────
// Small inline badge shown on customer account pages
export function LoyaltyBadge({ customerId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!customerId) return;
    api.get(`/loyalty/customer/${customerId}/balance`)
      .then(r => setData(r.data))
      .catch(() => {}); // silent — loyalty may not be configured
  }, [customerId]);

  if (!data || data.points_balance === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
      ⭐ {data.points_balance} pts
    </span>
  );
}

// ── LoyaltyPanel ─────────────────────────────────────────────────────────────
// Full panel shown inside the customer detail page
export default function LoyaltyPanel({ customerId, customerName }) {
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview"); // overview | history | redeem
  const [earnPoints, setEarnPoints] = useState("");
  const [redeemPoints, setRedeemPoints] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/loyalty/customer/${customerId}/balance`),
      api.get(`/loyalty/customer/${customerId}/history`),
    ])
      .then(([b, h]) => {
        setBalance(b.data);
        setHistory(h.data.history || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId]);

  useEffect(() => { refresh(); }, [refresh]);

  const flash = (text, isErr = false) => {
    setMsg({ text, isErr });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleEarn = async () => {
    if (!earnPoints || parseInt(earnPoints) <= 0) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/loyalty/customer/${customerId}/earn`, {
        points: parseInt(earnPoints),
        note: note || undefined,
      });
      flash(`✅ Awarded ${earnPoints} points. New balance: ${res.data.new_balance}`);
      setEarnPoints(""); setNote("");
      refresh();
    } catch (e) {
      flash(e.response?.data?.detail?.message || "Failed to award points", true);
    } finally { setSubmitting(false); }
  };

  const handleRedeem = async () => {
    if (!redeemPoints || parseInt(redeemPoints) <= 0) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/loyalty/customer/${customerId}/redeem`, {
        points: parseInt(redeemPoints),
        note: note || undefined,
      });
      flash(`✅ Redeemed ${redeemPoints} pts → ₹${res.data.rupee_discount} discount. Balance: ${res.data.new_balance}`);
      setRedeemPoints(""); setNote("");
      refresh();
    } catch (e) {
      flash(e.response?.data?.detail?.message || e.response?.data?.detail || "Redemption failed", true);
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-yellow-50 rounded-xl p-4 h-24 flex items-center justify-center text-yellow-400 text-sm">
        Loading loyalty data…
      </div>
    );
  }

  const pts = balance?.points_balance ?? 0;
  const rupeeVal = balance?.rupee_equivalent ?? 0;
  const canRedeem = balance?.can_redeem ?? false;

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 overflow-hidden">
      {/* Header */}
      <div className="bg-yellow-400 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="font-bold text-yellow-900 text-sm">Loyalty Points</p>
            <p className="text-yellow-800 text-xs">{customerName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-yellow-900">{pts.toLocaleString()}</p>
          <p className="text-xs text-yellow-800">≈ ₹{rupeeVal.toLocaleString()}</p>
        </div>
      </div>

      {/* Flash message */}
      {msg && (
        <div className={`px-4 py-2 text-sm font-medium ${msg.isErr ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-yellow-200 bg-white">
        {[["overview", "Overview"], ["earn", "Award"], ["redeem", "Redeem"], ["history", "History"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              tab === key ? "border-b-2 border-yellow-500 text-yellow-700 bg-yellow-50" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Overview */}
        {tab === "overview" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-yellow-100 text-center">
                <p className="text-2xl font-bold text-yellow-600">{pts}</p>
                <p className="text-xs text-gray-500 mt-1">Total Points</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-yellow-100 text-center">
                <p className="text-2xl font-bold text-green-600">₹{rupeeVal}</p>
                <p className="text-xs text-gray-500 mt-1">Redeem Value</p>
              </div>
            </div>
            {canRedeem ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center text-sm text-green-700 font-medium">
                🎉 Customer can redeem points for a discount!
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center text-xs text-gray-500">
                {pts === 0 ? "No points yet. Award points on purchases." : "Minimum points threshold not yet reached."}
              </div>
            )}
          </div>
        )}

        {/* Earn (award) */}
        {tab === "earn" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Manually award points to this customer.</p>
            <input
              type="number"
              min="1"
              placeholder="Points to award"
              value={earnPoints}
              onChange={e => setEarnPoints(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <input
              type="text"
              placeholder="Note (optional)"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button
              onClick={handleEarn}
              disabled={submitting || !earnPoints}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              {submitting ? "Awarding…" : "Award Points"}
            </button>
          </div>
        )}

        {/* Redeem */}
        {tab === "redeem" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Redeem points as a bill discount.</p>
            {!canRedeem && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700">
                ⚠️ Customer does not have enough points to redeem yet.
              </div>
            )}
            <input
              type="number"
              min="1"
              max={pts}
              placeholder={`Points to redeem (max ${pts})`}
              value={redeemPoints}
              onChange={e => setRedeemPoints(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <input
              type="text"
              placeholder="Bill reference / note (optional)"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button
              onClick={handleRedeem}
              disabled={submitting || !redeemPoints || !canRedeem}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              {submitting ? "Redeeming…" : "Redeem Points"}
            </button>
          </div>
        )}

        {/* History */}
        {tab === "history" && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-4">No points history yet.</p>
            ) : history.map(e => (
              <div key={e.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100 text-sm">
                <div>
                  <span className={`font-semibold ${e.points > 0 ? "text-green-600" : "text-red-500"}`}>
                    {e.points > 0 ? "+" : ""}{e.points} pts
                  </span>
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">{e.event_type}</span>
                  {e.note && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{e.note}</p>}
                </div>
                <span className="text-xs text-gray-400">{e.date ? new Date(e.date).toLocaleDateString("en-IN") : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
