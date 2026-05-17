import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE, authHeaders, getToken, parseJwt } from "../api";
import { Spinner } from "../components/ui/Spinner";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function fmtCurrency(n) {
  if (n == null) return "₹0";
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function storeLogoSrc(logoUrl) {
  if (!logoUrl) return null;
  return logoUrl.startsWith("http") ? logoUrl : `${API_BASE}${logoUrl}`;
}

const LICENSE_COLORS = {
  general: "bg-blue-100 text-blue-700 border-blue-200",
  simple:  "bg-purple-100 text-purple-700 border-purple-200",
  premium: "bg-amber-100 text-amber-800 border-amber-200",
};

function StatCard({ icon, label, value, sub, color = "text-gray-800" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StoreDetailPage() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    const payload = token ? parseJwt(token) : null;
    if (!token || payload?.role !== "admin") navigate("/home", { replace: true });
  }, [navigate]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [storeRes, revRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stores/${storeId}`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/admin/stores/${storeId}/revenue`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/admin/stores/${storeId}/users`, { headers: authHeaders() }),
      ]);
      if (storeRes.status === 404) { setError("Store not found"); setLoading(false); return; }
      if (storeRes.status === 401) { navigate("/login"); return; }

      const storeData = await storeRes.json().catch(() => null);
      const revData = revRes.ok ? await revRes.json().catch(() => null) : null;
      const usersData = usersRes.ok ? await usersRes.json().catch(() => []) : [];

      setStore(storeData);
      setRevenue(revData);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch {
      setError("Failed to load store details.");
    } finally {
      setLoading(false);
    }
  }, [storeId, navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Spinner size="lg" center />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="text-gray-600 font-medium">{error}</p>
        <button onClick={() => navigate("/admin")} className="mt-4 text-sm text-blue-600 hover:underline">← Back to Admin Console</button>
      </div>
    </div>
  );

  if (!store) return null;

  const days = daysUntil(store.license_expiry);
  const expiryColor = days == null ? "text-gray-400" : days < 0 ? "text-red-600" : days <= 30 ? "text-amber-600" : "text-green-600";
  const expiryLabel = days == null ? "—" : days < 0 ? `Expired ${Math.abs(days)}d ago` : days === 0 ? "Expires today" : `${days} days left`;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Back button */}
        <button onClick={() => navigate("/admin")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          ← Back to Admin Console
        </button>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-5">
            {store.logo_url
              ? <img src={storeLogoSrc(store.logo_url)} alt="" className="h-20 w-20 object-contain rounded-xl border border-gray-100 bg-gray-50 shrink-0" />
              : <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center text-3xl font-bold text-blue-600 shrink-0">
                  {(store.name || "?")[0].toUpperCase()}
                </div>
            }
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
                {store.license_type && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${LICENSE_COLORS[store.license_type] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {store.license_type}
                  </span>
                )}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${store.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                  {store.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
                {store.company_id && (
                  <span>🏢 <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{store.company_id}</span></span>
                )}
                {store.contact_phone && <span>📞 {store.contact_phone}</span>}
                {store.location && <span>📍 {store.location}</span>}
                {store.owner_name && <span>👤 {store.owner_name}</span>}
                {store.owner_email && <span>✉️ {store.owner_email}</span>}
              </div>
              {store.address && <p className="text-sm text-gray-400 mt-1">🏠 {store.address}</p>}
            </div>
          </div>

          {/* License dates */}
          <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Joined</p>
              <p className="text-gray-800 font-semibold mt-0.5">{fmtDate(store.join_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">License Expiry</p>
              <p className={`font-semibold mt-0.5 ${expiryColor}`}>{fmtDate(store.license_expiry)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Status</p>
              <p className={`font-semibold mt-0.5 ${expiryColor}`}>{expiryLabel}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">GSTIN</p>
              <p className="text-gray-800 font-semibold mt-0.5 font-mono text-xs">{store.gstin || "—"}</p>
            </div>
          </div>
        </div>

        {/* Revenue KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon="💰" label="Total Revenue" value={fmtCurrency(revenue?.total_revenue)} color="text-green-600"
            sub={`${revenue?.payment_count ?? 0} payments`} />
          <StatCard icon="👥" label="Customers" value={revenue?.customer_count ?? "—"} />
          <StatCard icon="📋" label="Transactions" value={revenue?.transaction_count ?? "—"} />
          <StatCard icon="👤" label="Staff Accounts" value={users.length}
            sub={users.filter(u => u.is_active).length + " active"} />
        </div>

        {/* Revenue by payment mode */}
        {revenue?.by_payment_mode && Object.keys(revenue.by_payment_mode).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Revenue by Payment Mode</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(revenue.by_payment_mode).map(([mode, amount]) => (
                <div key={mode} className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100 text-center min-w-[120px]">
                  <p className="text-xs text-gray-500 capitalize">{mode}</p>
                  <p className="text-lg font-bold text-gray-800 mt-0.5">{fmtCurrency(amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent payments */}
        {revenue?.recent_payments?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Recent Payments</h2>
            </div>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">ID</th>
                  <th className="px-5 py-3 text-left">Amount</th>
                  <th className="px-5 py-3 text-left">Mode</th>
                  <th className="px-5 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {revenue.recent_payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-gray-400 text-xs">#{p.id}</td>
                    <td className="px-5 py-3 font-semibold text-green-700">{fmtCurrency(p.amount)}</td>
                    <td className="px-5 py-3 text-gray-600 capitalize">{p.payment_mode || "—"}</td>
                    <td className="px-5 py-3 text-gray-500">{fmtDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Staff / Users */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Staff Accounts</h2>
            <span className="text-xs text-gray-400">{users.length} total</span>
          </div>
          {users.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No user accounts linked to this store.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-left">Role</th>
                  <th className="px-5 py-3 text-left">Designation</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{u.name || "—"}</td>
                    <td className="px-5 py-3 text-gray-600">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize
                        ${u.role === "admin" ? "bg-red-100 text-red-700" :
                          u.role === "manager" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{u.designation || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${u.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
