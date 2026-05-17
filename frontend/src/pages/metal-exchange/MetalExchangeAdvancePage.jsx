import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(n ?? 0);
const fmtMoney = (n) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n ?? 0)}`;

export default function MetalExchangeAdvancePage() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/metal-exchange/advance-balance`, { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${API_BASE}/api/metal-rates/current`, { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]).then(([bal, cur]) => {
      setList(Array.isArray(bal) ? bal : []);
      const map = {};
      (cur || []).forEach((r) => (map[r.metal_type] = r.rate_per_unit));
      setRates(map);
      setLoading(false);
    });
  }, []);

  const goldRate = rates["gold"] || 0;
  const silverRate = rates["silver"] || 0;

  // Totals
  const totalMetalValue = list.reduce((sum, row) => {
    const rate = row.metal_type === "silver" ? silverRate : goldRate;
    return sum + (row.advance_metal_weight || 0) * rate;
  }, 0);
  const totalMoney = list.reduce((sum, row) => sum + (row.advance_money || 0), 0);

  return (
    <ShopLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Advance Balance</h1>
        <p className="text-sm text-gray-500 mb-2">
          Metal or cash kept with the shop for future jewellery purchases.
        </p>

        {/* Live rate badge */}
        {(goldRate > 0 || silverRate > 0) && (
          <div className="flex gap-3 mb-5 flex-wrap">
            {goldRate > 0 && (
              <span className="text-xs font-semibold bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-1 rounded-full">
                🥇 Gold today: {fmtMoney(goldRate)}/g
              </span>
            )}
            {silverRate > 0 && (
              <span className="text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-700 px-3 py-1 rounded-full">
                🥈 Silver today: {fmtMoney(silverRate)}/g
              </span>
            )}
            {!goldRate && !silverRate && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                ⚠️ Rates not set today — values shown without conversion.{" "}
                <button
                  onClick={() => navigate("/metal-exchange/rates")}
                  className="underline font-semibold"
                >
                  Set rates
                </button>
              </span>
            )}
          </div>
        )}

        {/* Summary cards */}
        {!loading && list.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Total Metal Value (at today's rate)</p>
              <p className="text-2xl font-extrabold text-yellow-700">
                {goldRate > 0 ? fmtMoney(totalMetalValue) : "—"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">across {list.filter((r) => r.advance_metal_weight > 0).length} customer(s)</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Total Cash Advance</p>
              <p className="text-2xl font-extrabold text-blue-700">{fmtMoney(totalMoney)}</p>
              <p className="text-xs text-gray-400 mt-0.5">across {list.filter((r) => r.advance_money > 0).length} customer(s)</p>
            </div>
          </div>
        )}

        {/* Customer list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Customer Advances</h2>
            <button
              onClick={() => navigate("/metal-exchange/new")}
              className="text-xs text-indigo-600 hover:underline font-semibold"
            >
              + New Exchange
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl mb-2">🏦</p>
              <p className="text-gray-500 text-sm">No advance balances yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-medium">Customer</th>
                  <th className="text-right px-4 py-2.5 font-medium">Metal (g)</th>
                  <th className="text-right px-4 py-2.5 font-medium">Purity</th>
                  <th className="text-right px-4 py-2.5 font-medium">Metal Value</th>
                  <th className="text-right px-4 py-2.5 font-medium">Cash Advance</th>
                  <th className="text-right px-4 py-2.5 font-medium">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const rate = row.metal_type === "silver" ? silverRate : goldRate;
                  const metalValue = rate > 0 ? (row.advance_metal_weight || 0) * rate : null;
                  const total = (metalValue || 0) + (row.advance_money || 0);
                  return (
                    <tr key={row.customer_id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {row.customer_name}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {row.advance_metal_weight > 0 ? (
                          <span>
                            {fmt(row.advance_metal_weight)}g
                            {row.advance_metal_purity && (
                              <span className="text-gray-400 text-xs ml-1">
                                @ {row.advance_metal_purity.toFixed(1)}%
                              </span>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs">
                        {row.advance_metal_purity
                          ? `${row.advance_metal_purity.toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {metalValue != null && row.advance_metal_weight > 0 ? (
                          <span className="font-semibold text-yellow-700">
                            {fmtMoney(metalValue)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.advance_money > 0 ? (
                          <span className="font-semibold text-blue-700">
                            {fmtMoney(row.advance_money)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {total > 0 ? (
                          <span className="font-bold text-gray-900">{fmtMoney(total)}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td className="px-4 py-2.5 text-xs font-bold text-gray-500">Total</td>
                  <td colSpan={2} />
                  <td className="px-4 py-2.5 text-right font-bold text-yellow-700">
                    {goldRate > 0 ? fmtMoney(totalMetalValue) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-blue-700">
                    {fmtMoney(totalMoney)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                    {goldRate > 0 ? fmtMoney(totalMetalValue + totalMoney) : fmtMoney(totalMoney)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* How to use advance */}
        <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4 text-xs text-indigo-700">
          <p className="font-semibold mb-1">💡 Using advance for a new jewellery purchase</p>
          <p>
            When a customer with advance balance buys new jewellery, go to{" "}
            <strong>New Exchange → Keep Metal as Advance</strong> and record a{" "}
            <em>negative entry</em> (deduction) to reduce their balance. The deduction
            is at <em>today's rate</em>, which may differ from when they deposited. Record the
            difference as part of the bill's payment.
          </p>
        </div>
      </div>
    </ShopLayout>
  );
}
