import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { Spinner } from "../../components/ui/Spinner";

const STATUS_CONFIG = {
  in_stock:     { label: "Available",    cls: "bg-green-100 text-green-700" },
  available:    { label: "Available",    cls: "bg-green-100 text-green-700" },
  with_karigar: { label: "With Karigar", cls: "bg-blue-100 text-blue-700" },
  on_hold:      { label: "On Hold",      cls: "bg-yellow-100 text-yellow-700" },
  sold:         { label: "Sold",         cls: "bg-gray-100 text-gray-500" },
};

const METAL_CLS = {
  gold:   "bg-yellow-100 text-yellow-800",
  silver: "bg-slate-100 text-slate-700",
  other:  "bg-purple-100 text-purple-700",
};

export default function InventoryPiecesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ pieces: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [metalFilter, setMetalFilter] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (metalFilter) params.set("metal_type", metalFilter);
    fetch(`${API_BASE}/api/inventory?${params}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { pieces: [], summary: {} }))
      .then((d) => setData(d && d.pieces ? d : { pieces: Array.isArray(d) ? d : [], summary: {} }))
      .catch(() => setData({ pieces: [], summary: {} }))
      .finally(() => setLoading(false));
  }, [search, statusFilter, metalFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`${API_BASE}/api/inventory/${deleteId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const { pieces, summary } = data;

  return (
    <ShopLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pieces</h1>
            <p className="text-sm text-gray-500 mt-0.5">Serialized jewellery inventory</p>
          </div>
          <div className="flex gap-2">
            <Link to="/karigars"
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              🧑 Karigars
            </Link>
            <Link to="/inventory/pieces/new"
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">
              + Add Piece
            </Link>
          </div>
        </div>

        {/* Summary strip */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Pieces",  value: summary.total ?? pieces.length },
              { label: "Available",     value: summary.available ?? "—" },
              { label: "With Karigar",  value: summary.with_karigar ?? "—" },
              { label: "Gold (net wt)", value: `${summary.total_gold_g ?? 0}g` },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          <input
            type="text"
            placeholder="Search by name, serial or HUID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="">All Status</option>
            <option value="in_stock">Available</option>
            <option value="with_karigar">With Karigar</option>
            <option value="on_hold">On Hold</option>
            <option value="sold">Sold</option>
          </select>
          <select value={metalFilter} onChange={(e) => setMetalFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="">All Metal</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Piece list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" color="amber" center />
          </div>
        ) : pieces.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="text-4xl mb-3">💍</div>
            <div className="text-gray-500 font-medium">No pieces found</div>
            <Link to="/inventory/pieces/new"
              className="mt-4 inline-block px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">
              Add your first piece
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pieces.map((p) => {
              const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.in_stock;
              const mc = METAL_CLS[p.metal_type] || METAL_CLS.other;
              return (
                <div key={p.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-amber-300 transition-colors">
                  {/* Photo / icon */}
                  <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {p.photo_url
                      ? <img src={p.photo_url} alt={p.name || p.serial} className="w-full h-full object-cover" />
                      : <span className="text-2xl">💍</span>}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{p.name || p.serial}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mc}`}>
                        {p.metal_type?.charAt(0).toUpperCase() + p.metal_type?.slice(1)}
                        {p.purity ? ` · ${p.purity}%` : ""}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>
                        {sc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-gray-500">
                      {p.net_weight && <span>{p.net_weight}g net</span>}
                      {p.huid && (
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                          HUID: {p.huid}
                        </span>
                      )}
                      {p.category && <span>{p.category}</span>}
                      {p.name && <span className="text-xs text-gray-400">#{p.serial}</span>}
                      {p.karigar_name && (
                        <span className="text-blue-600 font-medium">🧑 {p.karigar_name}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => navigate(`/inventory/pieces/${p.id}/edit`)}
                      className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                      Edit
                    </button>
                    <Link to={`/inventory/pieces/${p.id}`}
                      className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                      Timeline
                    </Link>
                    <button onClick={() => setDeleteId(p.id)}
                      className="text-sm px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 text-red-600">
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4 text-center">
          {pieces.length} piece{pieces.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-2">Delete this piece?</h3>
            <p className="text-sm text-gray-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ShopLayout>
  );
}
