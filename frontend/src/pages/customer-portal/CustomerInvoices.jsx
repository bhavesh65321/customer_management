import React, { useState, useEffect } from "react";
import { apiGet } from "../../api";

export default function CustomerInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    apiGet("/api/customer-portal/invoices")
      .then(setInvoices)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = (transactionId) => {
    setDetail(null);
    apiGet(`/api/customer-portal/invoices/${transactionId}`)
      .then(setDetail)
      .catch((err) => setError(err.message));
  };

  if (loading) return <p className="text-gray-500">Loading invoices…</p>;

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Invoices</h1>
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
      )}
      {invoices.length === 0 ? (
        <p className="text-gray-500">No invoices yet.</p>
      ) : (
        <ul className="space-y-2">
          {invoices.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
            >
              <div>
                <span className="font-medium">Transaction #{inv.transaction_id}</span>
                {inv.grand_total != null && (
                  <span className="ml-2 text-gray-600">₹{inv.grand_total.toFixed(2)}</span>
                )}
                {inv.date && (
                  <span className="ml-2 text-sm text-gray-500">{inv.date.slice(0, 10)}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => loadDetail(inv.transaction_id)}
                className="text-sm text-blue-600 hover:underline"
              >
                View
              </button>
            </li>
          ))}
        </ul>
      )}
      {detail && (
        <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
          <h2 className="font-medium text-gray-900 mb-2">Invoice details</h2>
          <pre className="text-sm text-gray-700 overflow-auto max-h-96">
            {JSON.stringify(detail, null, 2)}
          </pre>
          <button
            type="button"
            onClick={() => setDetail(null)}
            className="mt-2 text-sm text-gray-600 hover:underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
