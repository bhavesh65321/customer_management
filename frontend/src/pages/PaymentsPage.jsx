import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ShopLayout from "../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../api";
import { useNavigate } from "react-router-dom";

const TABS = [
  { id: "record", label: "Record Payment" },
  { id: "outstanding", label: "Outstanding Balance" },
  { id: "history", label: "Payment History" },
];

export default function PaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "record";
  const [activeTab, setActiveTab] = useState(
    TABS.some((t) => t.id === tabFromUrl) ? tabFromUrl : "record"
  );
  const [outstanding, setOutstanding] = useState({ items: [], totalDue: 0, count: 0 });
  const [history, setHistory] = useState([]);
  const [loadingOutstanding, setLoadingOutstanding] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [recordTransactionId, setRecordTransactionId] = useState("");
  const [recordAmount, setRecordAmount] = useState("");
  const [recordMode, setRecordMode] = useState("Cash");
  const [recordSubmitting, setRecordSubmitting] = useState(false);
  const [recordError, setRecordError] = useState(null);
  const [recordSuccess, setRecordSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = searchParams.get("tab") || "record";
    if (TABS.some((x) => x.id === t)) setActiveTab(t);
  }, [searchParams]);

  const switchTab = (id) => {
    setActiveTab(id);
    setSearchParams(id === "record" ? {} : { tab: id });
  };

  useEffect(() => {
    if (activeTab !== "outstanding") return;
    setLoadingOutstanding(true);
    fetch(`${API_BASE}/api/payments/outstanding`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { items: [], totalDue: 0, count: 0 }))
      .then((data) => setOutstanding(data))
      .catch(() => setOutstanding({ items: [], totalDue: 0, count: 0 }))
      .finally(() => setLoadingOutstanding(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "history") return;
    setLoadingHistory(true);
    fetch(`${API_BASE}/api/payments/history`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [activeTab]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setRecordError(null);
    setRecordSuccess(false);
    const txnId = parseInt(recordTransactionId, 10);
    const amount = parseFloat(recordAmount);
    if (!txnId || txnId < 1 || !amount || amount <= 0) {
      setRecordError("Enter a valid bill number and amount.");
      return;
    }
    setRecordSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/transactions/${txnId}/record-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ amount, payment_mode: recordMode || null }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRecordError(data.detail || "Failed to record payment.");
        return;
      }
      setRecordSuccess(true);
      setRecordTransactionId("");
      setRecordAmount("");
      if (outstanding.items?.length) {
        setOutstanding((prev) => ({
          ...prev,
          items: prev.items.filter((t) => t.id !== txnId),
          totalDue: Math.max(0, (prev.totalDue || 0) - amount),
          count: Math.max(0, (prev.count || 0) - 1),
        }));
      }
    } catch {
      setRecordError("Network error.");
    } finally {
      setRecordSubmitting(false);
    }
  };

  return (
    <ShopLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Payments</h1>
        <div className="flex gap-2 border-b border-gray-200 mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition ${
                activeTab === t.id
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "record" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Record Payment</h2>
            <form onSubmit={handleRecordPayment} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill / Transaction ID</label>
                <input
                  type="number"
                  min="1"
                  value={recordTransactionId}
                  onChange={(e) => setRecordTransactionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g. 5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={recordAmount}
                  onChange={(e) => setRecordAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment mode</label>
                <select
                  value={recordMode}
                  onChange={(e) => setRecordMode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Bank">Bank</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {recordError && (
                <p className="text-sm text-red-600">{recordError}</p>
              )}
              {recordSuccess && (
                <p className="text-sm text-green-600">Payment recorded successfully.</p>
              )}
              <button
                type="submit"
                disabled={recordSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {recordSubmitting ? "Recording…" : "Record Payment"}
              </button>
            </form>
            <p className="mt-4 text-sm text-gray-500">
              You can find the Bill ID on the customer’s account page or in Outstanding Balance.
            </p>
          </div>
        )}

        {activeTab === "outstanding" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <span className="font-medium text-gray-800">Bills with due amount</span>
              <span className="text-sm text-gray-600">
                Total due: ₹{(outstanding.totalDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {loadingOutstanding ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
              </div>
            ) : outstanding.items?.length === 0 ? (
              <p className="px-6 py-8 text-gray-500 text-center">No outstanding bills.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Bill #</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Due</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {outstanding.items.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{row.id}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">{row.customerName}</td>
                        <td className="px-6 py-3 text-sm text-right text-gray-700">
                          ₹{(row.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3 text-sm text-right text-amber-700 font-medium">
                          ₹{(row.dueAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3 text-sm text-right text-gray-500">
                          {row.date ? new Date(row.date).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setRecordTransactionId(String(row.id));
                              setRecordAmount(String(row.dueAmount || 0));
                              switchTab("record");
                            }}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            Record payment
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/customer/${row.customerId}`)}
                            className="ml-3 text-sm font-medium text-gray-600 hover:text-gray-800"
                          >
                            View customer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            {loadingHistory ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
              </div>
            ) : history.length === 0 ? (
              <p className="px-6 py-8 text-gray-500 text-center">No payment history yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Bill #</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-700">
                          {p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700">{p.customerName}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">{p.transactionId}</td>
                        <td className="px-6 py-3 text-sm text-right font-medium text-green-700">
                          ₹{(p.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500">{p.paymentMode || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </ShopLayout>
  );
}
