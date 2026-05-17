import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { Spinner } from "../../components/ui/Spinner";

const EMPTY_FORM = { name: "", phone: "", rate_per_gram: "", notes: "" };

export default function KarigarsPage() {
  const navigate = useNavigate();
  const [karigars, setKarigars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/karigars`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setKarigars(Array.isArray(d) ? d : []))
      .catch(() => setKarigars([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (k) => {
    setForm({ name: k.name, phone: k.phone || "", rate_per_gram: k.rate_per_gram || "", notes: k.notes || "" });
    setEditId(k.id);
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    setSaving(true);
    setFormError("");
    try {
      const url = editId ? `${API_BASE}/api/karigars/${editId}` : `${API_BASE}/api/karigars`;
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          rate_per_gram: form.rate_per_gram.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed");
      }
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm("Remove this karigar?")) return;
    await fetch(`${API_BASE}/api/karigars/${id}`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: false }),
    });
    load();
  };

  return (
    <ShopLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => navigate("/inventory/pieces")}
              className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1">
              ← Pieces
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Karigars</h1>
          </div>
          <button onClick={openAdd}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">
            + Add Karigar
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" color="amber" center />
          </div>
        ) : karigars.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="text-4xl mb-3">🧑</div>
            <div className="text-gray-500 font-medium">No karigars yet</div>
            <button onClick={openAdd}
              className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">
              Add karigar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {karigars.map((k) => (
              <div key={k.id} className="bg-white border border-gray-200 rounded-xl p-5">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg flex-shrink-0">
                      {k.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{k.name}</div>
                      {k.rate_per_gram && (
                        <div className="text-sm text-gray-500">₹{k.rate_per_gram}/g</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(k)}
                      className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                      Edit
                    </button>
                    <button onClick={() => handleDeactivate(k.id)}
                      className="text-sm px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 text-red-600">
                      Remove
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-gray-900">{k.pieces_count ?? 0}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Pieces held</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-yellow-800">{k.total_weight_held ?? 0}g</div>
                    <div className="text-xs text-gray-500 mt-0.5">Gold held</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    {k.phone ? (
                      <a href={`tel:${k.phone}`}
                        className="text-base font-bold text-blue-800 hover:underline block">
                        {k.phone}
                      </a>
                    ) : (
                      <div className="text-base font-bold text-gray-400">—</div>
                    )}
                    <div className="text-xs text-gray-500 mt-0.5">Phone</div>
                  </div>
                </div>

                {/* Current pieces */}
                {k.pieces && k.pieces.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                      Currently holding
                    </div>
                    <div className="space-y-1.5">
                      {k.pieces.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{p.name || p.serial}</span>
                          <span className="text-gray-400">
                            {p.net_weight ? `${p.net_weight}g` : "—"}
                            {p.given_on ? ` · since ${p.given_on}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {k.notes && (
                  <div className="mt-3 text-xs text-gray-400 border-t border-gray-100 pt-2">
                    {k.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-bold text-gray-900 mb-4 text-lg">
              {editId ? "Edit Karigar" : "Add Karigar"}
            </h2>
            {formError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {formError}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Ramesh Sharma" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="9876543210" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹/g)</label>
                  <input value={form.rate_per_gram}
                    onChange={(e) => setForm((f) => ({ ...f, rate_per_gram: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Specialty, payment terms…" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ShopLayout>
  );
}
