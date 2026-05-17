import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { parseApiError } from "../../utils/apiError";

const PURITY_PRESETS = [
  { label: "24K", value: 99.9 },
  { label: "22K", value: 91.6 },
  { label: "18K", value: 75.0 },
  { label: "14K", value: 58.3 },
  { label: "999 (Silver)", value: 99.9 },
  { label: "925 (Silver)", value: 92.5 },
];

export default function InventoryPieceNewPage() {
  const navigate = useNavigate();
  const { id: pieceId } = useParams();
  const isEdit = !!pieceId;

  const [form, setForm] = useState({
    name: "", serial: "", category: "", photo_url: "",
    metal_type: "gold", purity: "", gross_weight: "", net_weight: "",
    huid: "", stone_details: "", making_charge_per_g: "",
    status: "in_stock", karigar_id: "", given_to_karigar_on: "",
    notes: "",
  });
  const [karigars, setKarigars] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPurityRef, setShowPurityRef] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/karigars`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setKarigars(Array.isArray(d) ? d : []))
      .catch(() => {});

    if (isEdit) {
      fetch(`${API_BASE}/api/inventory/${pieceId}`, { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((p) => {
          if (!p) return;
          setForm({
            name: p.name || "",
            serial: p.serial || "",
            category: p.category || "",
            photo_url: p.photo_url || "",
            metal_type: p.metal_type || "gold",
            purity: p.purity ?? "",
            gross_weight: p.gross_weight ?? "",
            net_weight: p.net_weight ?? "",
            huid: p.huid || "",
            stone_details: p.stone_details || "",
            making_charge_per_g: p.making_charge_per_g ?? "",
            status: p.status || "in_stock",
            karigar_id: p.karigar_id ?? "",
            given_to_karigar_on: p.given_to_karigar_on || "",
            notes: p.notes || "",
          });
        })
        .catch(() => {});
    }
  }, [isEdit, pieceId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.serial.trim()) { setError("Serial number is required"); return; }
    if (!form.gross_weight || !form.net_weight) { setError("Gross and net weight are required"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) payload[k] = v;
      });
      // numeric coercions
      ["purity", "gross_weight", "net_weight", "making_charge_per_g"].forEach((k) => {
        if (payload[k] !== undefined) payload[k] = parseFloat(payload[k]);
      });
      if (payload.karigar_id) payload.karigar_id = parseInt(payload.karigar_id);

      const url = isEdit
        ? `${API_BASE}/api/inventory/${pieceId}`
        : `${API_BASE}/api/inventory`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(parseApiError(d, isEdit ? "Failed to update piece. Please try again." : "Failed to save piece. Please try again."));
      }
      navigate("/inventory/pieces");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ShopLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate("/inventory/pieces")}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
          ← Pieces
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isEdit ? "Edit Piece" : "Add New Piece"}
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Basic Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Basic Info</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={form.name} onChange={(e) => set("name", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. Solitaire Ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial *</label>
                <input value={form.serial} onChange={(e) => set("serial", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. JW-001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input value={form.category} onChange={(e) => set("category", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Rings, Chains, Bangles…" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL</label>
                <input value={form.photo_url} onChange={(e) => set("photo_url", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="https://…" />
              </div>
            </div>
          </div>

          {/* Metal Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Metal Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Metal Type</label>
              <div className="flex gap-3">
                {["gold", "silver", "other"].map((m) => (
                  <button type="button" key={m} onClick={() => set("metal_type", m)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                      form.metal_type === m
                        ? "bg-amber-600 border-amber-600 text-white"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Purity (%)</label>
                <button type="button" onClick={() => setShowPurityRef((s) => !s)}
                  className="text-xs text-amber-600 hover:underline">
                  Reference {showPurityRef ? "▲" : "▾"}
                </button>
              </div>
              <input value={form.purity} onChange={(e) => set("purity", e.target.value)}
                type="number" step="0.1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="e.g. 91.6" />
              {showPurityRef && (
                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                  {PURITY_PRESETS.map((p) => (
                    <button type="button" key={p.label}
                      onClick={() => { set("purity", p.value); setShowPurityRef(false); }}
                      className="w-full flex justify-between px-4 py-2 text-sm hover:bg-amber-50 text-left border-b border-gray-100 last:border-0">
                      <span className="font-medium text-gray-700">{p.label}</span>
                      <span className="text-gray-500">{p.value}%</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gross Weight (g) *</label>
                <input value={form.gross_weight} onChange={(e) => set("gross_weight", e.target.value)}
                  type="number" step="0.001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="8.500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Net Weight (g) *</label>
                <input value={form.net_weight} onChange={(e) => set("net_weight", e.target.value)}
                  type="number" step="0.001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="7.200" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HUID <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input value={form.huid} onChange={(e) => set("huid", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="AA123456" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Making Charge (₹/g)</label>
                <input value={form.making_charge_per_g} onChange={(e) => set("making_charge_per_g", e.target.value)}
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="450" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stone Details <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input value={form.stone_details} onChange={(e) => set("stone_details", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="e.g. Diamond 0.15ct" />
            </div>
          </div>

          {/* Status & Karigar */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Status</h2>
            <div className="flex flex-wrap gap-2">
              {[
                ["in_stock", "Available"],
                ["with_karigar", "With Karigar"],
                ["on_hold", "On Hold"],
                ["sold", "Sold"],
              ].map(([val, label]) => (
                <button type="button" key={val} onClick={() => set("status", val)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.status === val
                      ? "bg-amber-600 border-amber-600 text-white"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {form.status === "with_karigar" && (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Karigar</label>
                  <select value={form.karigar_id} onChange={(e) => set("karigar_id", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="">Select karigar…</option>
                    {karigars.map((k) => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Given On</label>
                  <input type="date" value={form.given_to_karigar_on}
                    onChange={(e) => set("given_to_karigar_on", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Any additional notes…" />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate("/inventory/pieces")}
              className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Piece"}
            </button>
          </div>
        </form>
      </div>
    </ShopLayout>
  );
}
