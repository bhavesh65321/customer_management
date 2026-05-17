import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { Spinner } from "../../components/ui/Spinner";

const today = () => new Date().toISOString().slice(0, 10);

function dueBadge(dateStr, status) {
  if (status === "delivered") return null;
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date(today())) / 86400000);
  if (diff < 0)  return <span className="text-xs font-semibold text-red-600">⚠ {Math.abs(diff)}d overdue</span>;
  if (diff === 0) return <span className="text-xs font-semibold text-amber-600">Due today</span>;
  if (diff <= 3)  return <span className="text-xs text-amber-500">Due in {diff}d</span>;
  return null;
}

const STATUS_STYLES = {
  pending:     "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  ready:       "bg-green-100 text-green-700",
  delivered:   "bg-gray-100 text-gray-400",
};
const STATUS_LABELS = {
  pending: "Pending",
  in_progress: "In progress",
  ready: "Ready",
  delivered: "Delivered",
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [alerts, setAlerts] = useState(null);
  const [remindLoading, setRemindLoading] = useState(false);
  const [remindMsg, setRemindMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let url = `${API_BASE}/api/orders?`;
    if (typeFilter) url += `type=${typeFilter}&`;
    if (statusFilter) url += `status=${statusFilter}&`;
    const [ordersRes, alertsRes] = await Promise.all([
      fetch(url, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/orders/workflow-alerts?days_ahead=3`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    setOrders(Array.isArray(ordersRes) ? ordersRes : []);
    setAlerts(alertsRes);
    setLoading(false);
  }, [typeFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const sendReminders = async () => {
    setRemindLoading(true);
    const res = await fetch(`${API_BASE}/api/orders/send-due-reminders?days_ahead=3`, {
      method: "POST", headers: authHeaders(),
    });
    const d = await res.json().catch(() => ({}));
    setRemindMsg(d.message || "Done.");
    setRemindLoading(false);
    setTimeout(() => setRemindMsg(""), 4000);
  };

  const overdueCount = (alerts?.overdue_not_started?.length ?? 0) + (alerts?.overdue_in_progress?.length ?? 0);
  const readyCount = orders.filter(o => o.status === "ready").length;

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.customer_name?.toLowerCase().includes(q) ||
      (o.description || o.item_description || "").toLowerCase().includes(q)
    );
  });

  return (
    <ShopLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders & Repairs</h1>
            <div className="flex gap-3 mt-1 text-sm">
              {overdueCount > 0 && (
                <span className="text-red-500 font-semibold">⚠ {overdueCount} overdue</span>
              )}
              {readyCount > 0 && (
                <span className="text-green-600 font-semibold">✅ {readyCount} ready to bill</span>
              )}
            </div>
          </div>
          <Link
            to="/orders/new"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg"
          >
            + New Order / Repair
          </Link>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            placeholder="Search customer or item…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">All types</option>
            <option value="new_order">New order</option>
            <option value="repair">Repair</option>
          </select>
          <button
            onClick={sendReminders}
            disabled={remindLoading}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {remindLoading ? "Sending…" : "📣 Notify customers"}
          </button>
          {remindMsg && <span className="self-center text-xs text-green-600 font-medium">{remindMsg}</span>}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" color="amber" center />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-gray-500 font-medium">No orders found.</p>
              <Link to="/orders/new" className="mt-2 inline-block text-amber-600 text-sm font-semibold hover:underline">
                Create first order →
              </Link>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(o => {
                  const isOverdue = o.expected_date && new Date(o.expected_date) < new Date(today()) && o.status !== "delivered";
                  return (
                    <tr
                      key={o.id}
                      onClick={() => navigate(`/orders/${o.id}`)}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${isOverdue ? "bg-red-50/40" : ""}`}
                    >
                      {/* Customer */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 text-sm">{o.customer_name}</p>
                        {o.karigar_name && (
                          <p className="text-xs text-gray-400 mt-0.5">👤 {o.karigar_name}</p>
                        )}
                      </td>

                      {/* Item */}
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="text-sm text-gray-700 truncate">
                          {o.description || o.item_description || "—"}
                        </p>
                        {o.workflow_step && o.status === "in_progress" && (
                          <p className="text-xs text-blue-500 mt-0.5 truncate">⚙ {o.workflow_step}</p>
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">
                          {o.type === "repair" ? "🔧 Repair" : "💍 New order"}
                        </span>
                      </td>

                      {/* Due */}
                      <td className="px-4 py-3">
                        {o.expected_date ? (
                          <div>
                            <p className="text-sm text-gray-600">
                              {new Date(o.expected_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            </p>
                            {dueBadge(o.expected_date, o.status)}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[o.status] || "bg-gray-100 text-gray-600"}`}>
                          {STATUS_LABELS[o.status] || o.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        {o.status === "ready" ? (
                          <Link
                            to={`/shop?customerId=${o.customer_id}&orderId=${o.id}`}
                            className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Create Bill →
                          </Link>
                        ) : (
                          <button
                            onClick={() => navigate(`/orders/${o.id}`)}
                            className="text-xs font-medium text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            Open
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          {filtered.length} order{filtered.length !== 1 ? "s" : ""} · Click any row to open
        </p>
      </div>
    </ShopLayout>
  );
}
