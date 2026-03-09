import React, { useState, useEffect } from "react";
import ShopLayout from "../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../api";

export default function RemindersPage() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/reminders/outstanding-summary`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then(setSummary)
      .catch(() => setSummary([]))
      .finally(() => setLoading(false));
  }, []);

  const sendReminders = () => {
    setSending(true);
    setResult(null);
    fetch(`${API_BASE}/api/reminders/send`, { method: "POST", headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then(setResult)
      .catch(() => setResult({ error: true }))
      .finally(() => setSending(false));
  };

  return (
    <ShopLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Reminders</h1>
        <p className="text-gray-600 mb-6">
          Send payment reminders to customers who have an outstanding balance (email and/or SMS, if configured).
        </p>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <span className="font-medium text-gray-800">Customers with outstanding balance</span>
                <span className="text-sm text-gray-600">{summary.length} customer(s)</span>
              </div>
              {summary.length === 0 ? (
                <p className="px-6 py-8 text-gray-500 text-center">No outstanding balances.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {summary.map((s) => (
                    <li key={s.customerId} className="px-6 py-3 flex justify-between items-center">
                      <span className="font-medium text-gray-800">{s.customerName}</span>
                      <span className="text-amber-700">
                        ₹{(s.totalDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({s.billCount} bill(s))
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={sendReminders}
              disabled={sending || summary.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "Sending…" : "Send reminders to all"}
            </button>
            {result && (
              <p className={`mt-4 text-sm ${result.error ? "text-red-600" : "text-green-600"}`}>
                {result.error
                  ? "Failed to send reminders."
                  : `Done. ${result.notificationsSent ?? 0} notification(s) sent to ${result.customersProcessed ?? 0} customer(s).`}
              </p>
            )}
          </>
        )}
      </div>
    </ShopLayout>
  );
}
