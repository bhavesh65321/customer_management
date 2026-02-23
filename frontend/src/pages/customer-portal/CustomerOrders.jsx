import React, { useState, useEffect } from "react";
import { apiGet } from "../../api";

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/api/customer-portal/orders")
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading purchases…</p>;

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">My purchases</h1>
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
      )}
      {orders.length === 0 ? (
        <p className="text-gray-500">No purchases yet.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="p-4 bg-white rounded-lg border border-gray-200"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium">Purchase #{order.id}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    {order.date ? order.date.slice(0, 10) : ""}
                  </span>
                </div>
                <span className="font-medium text-blue-600">
                  ₹{order.grand_total != null ? order.grand_total.toFixed(2) : "0.00"}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Paid: ₹{order.paid_amount != null ? order.paid_amount.toFixed(2) : "0.00"}
                {order.due_amount > 0 && (
                  <span className="text-amber-600"> · Due: ₹{order.due_amount.toFixed(2)}</span>
                )}
              </div>
              {order.products && order.products.length > 0 && (
                <ul className="mt-2 text-sm text-gray-500 list-disc list-inside">
                  {order.products.map((p, i) => (
                    <li key={i}>
                      {p.productName || "Item"} — ₹{p.total != null ? p.total.toFixed(2) : "0.00"}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
