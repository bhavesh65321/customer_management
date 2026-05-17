import React, { useState, useEffect } from "react";
import { apiGet } from "../../api";

const WORK_STATUS_LABELS = {
  pending: "Received — we will start soon",
  in_progress: "Work in progress",
  ready: "Ready for pickup / delivery",
  delivered: "Delivered",
};

export default function CustomerOrders() {
  const [tab, setTab] = useState("purchases");
  const [orders, setOrders] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const p1 = apiGet("/api/customer-portal/orders").catch((e) => {
      throw e;
    });
    const p2 = apiGet("/api/customer-portal/work-orders").catch(() => []);
    Promise.all([p1, p2])
      .then(([purchases, work]) => {
        setOrders(Array.isArray(purchases) ? purchases : []);
        setWorkOrders(Array.isArray(work) ? work : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Orders & purchases</h1>
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab("purchases")}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "purchases" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          Shop purchases (bills)
        </button>
        <button
          type="button"
          onClick={() => setTab("work")}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "work" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          Custom orders & repairs
        </button>
      </div>
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {tab === "purchases" && (
        <>
          {orders.length === 0 ? (
            <p className="text-gray-500">No purchases yet.</p>
          ) : (
            <ul className="space-y-4">
              {orders.map((order) => (
                <li key={order.id} className="p-4 bg-white rounded-lg border border-gray-200">
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
        </>
      )}

      {tab === "work" && (
        <>
          <p className="text-sm text-gray-600 mb-3">
            Track jewellery you ordered or left for repair. The shop notifies you when the status changes.
          </p>
          {workOrders.length === 0 ? (
            <p className="text-gray-500">No custom orders or repairs yet.</p>
          ) : (
            <ul className="space-y-4">
              {workOrders.map((w) => (
                <li key={w.id} className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-medium">
                        {w.type === "repair" ? "Repair" : "Custom order"} #{w.id}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {w.created_at ? w.created_at.slice(0, 10) : ""}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium px-2 py-1 rounded ${
                        w.status === "delivered"
                          ? "bg-green-100 text-green-800"
                          : w.status === "ready"
                            ? "bg-blue-100 text-blue-800"
                            : w.status === "in_progress"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {WORK_STATUS_LABELS[w.status] || w.status}
                    </span>
                  </div>
                  {(w.item_description || w.description) && (
                    <p className="mt-2 text-sm text-gray-700">{w.item_description || w.description}</p>
                  )}
                  <div className="mt-2 text-sm text-gray-600 space-y-0.5">
                    {w.expected_date && <p>Expected: {w.expected_date}</p>}
                    {w.karigar_name && <p>Karigar: {w.karigar_name}</p>}
                    {w.workflow_step && <p>Step: {w.workflow_step}</p>}
                    {w.amount_charged != null && (
                      <p>Amount: ₹{Number(w.amount_charged).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
