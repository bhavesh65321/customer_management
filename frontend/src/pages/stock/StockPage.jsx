import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import BarcodeScanner from "../../components/ui/BarcodeScanner";
import { Spinner } from "../../components/ui/Spinner";

const METAL_COLORS = {
  gold: "bg-amber-100 text-amber-800",
  silver: "bg-gray-100 text-gray-700",
  diamond: "bg-blue-100 text-blue-800",
  other: "bg-purple-100 text-purple-800",
};

function DashCard({ label, value, sub, color = "text-gray-900" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function StockPage() {
  const navigate = useNavigate();
  const [dash, setDash] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMetal, setFilterMetal] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterMetal) params.set("metal_type", filterMetal);
    if (filterCat) params.set("category_id", filterCat);
    const [dashRes, itemsRes, catsRes] = await Promise.all([
      fetch(`${API_BASE}/api/stock/dashboard`, { headers: authHeaders() }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/api/stock/items?${params}`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/stock/categories`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
    ]);
    setDash(dashRes);
    setItems(Array.isArray(itemsRes) ? itemsRes : []);
    setCategories(Array.isArray(catsRes) ? catsRes : []);
    setLoading(false);
  }, [search, filterMetal, filterCat]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`${API_BASE}/api/stock/items/${deleteId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    setDeleteId(null);
    setDeleting(false);
    load();
  };

  return (
    <ShopLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
            <p className="text-sm text-gray-500 mt-0.5">Jewellery inventory & movements</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowScanner(true)}
              className="px-4 py-2 text-sm font-semibold border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50"
            >
              📷 Scan Barcode
            </button>
            <Link to="/stock/movements" className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Stock In / Out
            </Link>
            <Link to="/stock/items/new" className="px-4 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg">
              + Add Item
            </Link>
          </div>
        </div>

        {/* Barcode Scanner Modal */}
        {showScanner && (
          <BarcodeScanner
            autoLookup={true}
            onResult={(code) => setSearch(code)}
            onClose={() => setShowScanner(false)}
          />
        )}

        {/* Dashboard Cards */}
        {dash && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <DashCard label="Total Items" value={dash.total_items} />
            <DashCard label="Low Stock" value={dash.low_stock_count} color={dash.low_stock_count > 0 ? "text-red-600" : "text-gray-900"} />
            <DashCard label="Gold (est.)" value={`${dash.total_gold_g.toFixed(1)}g`} color="text-amber-700" />
            <DashCard label="Silver (est.)" value={`${dash.total_silver_g.toFixed(1)}g`} color="text-gray-600" />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <select
            value={filterMetal}
            onChange={e => setFilterMetal(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">All Metals</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="diamond">Diamond</option>
            <option value="other">Other</option>
          </select>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</option>
            ))}
          </select>
          <Link to="/stock/low-stock" className="px-3 py-2 text-sm border border-amber-400 text-amber-700 rounded-lg hover:bg-amber-50">
            ⚠️ Low Stock {dash?.low_stock_count > 0 && `(${dash.low_stock_count})`}
          </Link>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" color="amber" center />
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-gray-500 font-medium">No items found.</p>
              <Link to="/stock/items/new" className="mt-3 inline-block text-amber-600 font-semibold text-sm hover:underline">
                Add your first stock item →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Metal / Purity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Weight</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">HUID</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.category || item.category_id ? "—" : ""}{item.description ? ` · ${item.description}` : ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        {item.metal_type ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${METAL_COLORS[item.metal_type] || "bg-gray-100 text-gray-700"}`}>
                            {item.metal_type}
                            {item.purity_percent ? ` ${item.purity_percent}%` : ""}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.net_weight_g ? (
                          <span>{item.net_weight_g}g net{item.gross_weight_g ? ` / ${item.gross_weight_g}g gross` : ""}</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{item.huid || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-gray-900">{item.quantity}</span>
                        <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                      </td>
                      <td className="px-4 py-3">
                        {item.is_low_stock ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-700">
                            ⚠ Low
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-700">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(`/stock/items/${item.id}/edit`)}
                            className="px-3 py-1 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(item.id)}
                            className="px-3 py-1 text-xs font-medium border border-red-200 rounded-lg text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Movements */}
        {dash?.recent_movements?.length > 0 && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Recent Movements</h2>
              <Link to="/stock/movements" className="text-sm text-amber-600 hover:underline font-medium">View all →</Link>
            </div>
            <div className="space-y-2">
              {dash.recent_movements.map(m => (
                <div key={m.id} className="flex items-center gap-3 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${m.quantity > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {m.quantity > 0 ? "+" : ""}{m.quantity}
                  </span>
                  <span className="text-gray-500">{m.movement_reason || m.movement_type}</span>
                  {m.notes && <span className="text-gray-400">· {m.notes}</span>}
                  <span className="ml-auto text-gray-400 text-xs">{m.created_at ? new Date(m.created_at).toLocaleDateString() : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Delete Item?</h3>
            <p className="text-sm text-gray-500 mb-6">This will also delete all movements for this item. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ShopLayout>
  );
}
