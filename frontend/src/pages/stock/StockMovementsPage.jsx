import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { parseApiError } from "../../utils/apiError";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";

const REASON_LABELS = {
  purchase: { label: "Purchase", color: "bg-green-100 text-green-700", sign: "+" },
  sale: { label: "Sale", color: "bg-blue-100 text-blue-700", sign: "-" },
  return_customer: { label: "Customer Return", color: "bg-yellow-100 text-yellow-700", sign: "+" },
  karigar_out: { label: "Karigar Out", color: "bg-orange-100 text-orange-700", sign: "-" },
  karigar_in: { label: "Karigar In", color: "bg-teal-100 text-teal-700", sign: "+" },
  adjustment: { label: "Adjustment", color: "bg-purple-100 text-purple-700", sign: "±" },
  damage: { label: "Damage / Loss", color: "bg-red-100 text-red-700", sign: "-" },
};

const OUT_MOVEMENT_TYPES = new Set(["sale", "order_use", "karigar_out", "damage"]);

export default function StockMovementsPage() {
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterItem, setFilterItem] = useState("");
  const [form, setForm] = useState({
    item_id: "", movement_reason: "purchase", weight_g: "",
    quantity: "1", rate_per_g: "", notes: "", supplier_name: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = filterItem ? `?item_id=${filterItem}` : "";
    const [itemsRes, movsRes] = await Promise.all([
      fetch(`${API_BASE}/api/stock/items`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/stock/movements${params}`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
    ]);
    setItems(Array.isArray(itemsRes) ? itemsRes : []);
    setMovements(Array.isArray(movsRes) ? movsRes : []);
    setLoading(false);
  }, [filterItem]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.item_id) { setError("Select an item."); return; }
    if (!form.quantity || parseFloat(form.quantity) <= 0) { setError("Enter a valid quantity."); return; }
    setSaving(true);
    try {
      const reason = form.movement_reason;
      const isOut = OUT_MOVEMENT_TYPES.has(reason);
      const body = {
        item_id: parseInt(form.item_id),
        quantity: parseFloat(form.quantity),
        movement_type: isOut ? "sale" : "purchase",
        movement_reason: reason,
        weight_g: form.weight_g ? parseFloat(form.weight_g) : null,
        rate_per_g: form.rate_per_g ? parseFloat(form.rate_per_g) : null,
        notes: form.notes.trim() || null,
        supplier_name: form.supplier_name.trim() || null,
      };
      const res = await fetch(`${API_BASE}/api/stock/movements`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(parseApiError(d, "Failed to record movement. Please try again."));
      }
      setSuccess("Movement recorded successfully.");
      setForm(f => ({ ...f, weight_g: "", quantity: "1", rate_per_g: "", notes: "", supplier_name: "" }));
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedItem = items.find(i => String(i.id) === String(form.item_id));
  const reason = form.movement_reason;
  const isOut = OUT_MOVEMENT_TYPES.has(reason);

  return (
    <ShopLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock In / Out</h1>
            <p className="text-sm text-gray-500 mt-0.5">Record purchases, sales, karigar movements, adjustments</p>
          </div>
          <Link to="/stock" className="text-sm text-amber-600 font-semibold hover:underline">← Back to Stock</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Record Movement Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Record Movement</h2>

            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
            {success && <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
                <select name="item_id" value={form.item_id} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
                  <option value="">Select item…</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} — {i.quantity} {i.unit} in stock
                    </option>
                  ))}
                </select>
                {selectedItem && (
                  <p className="mt-1 text-xs text-gray-400">
                    Current stock: <strong>{selectedItem.quantity} {selectedItem.unit}</strong>
                    {selectedItem.net_weight_g ? ` · ${selectedItem.net_weight_g}g/piece` : ""}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Movement Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(REASON_LABELS).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, movement_reason: key }))}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left ${
                        form.movement_reason === key
                          ? `${meta.color} border-current ring-1 ring-current`
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {meta.sign} {meta.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isOut ? "Qty Out *" : "Qty In *"}
                  </label>
                  <input name="quantity" value={form.quantity} onChange={handleChange}
                    type="number" step="0.001" min="0.001" required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (g)</label>
                  <input name="weight_g" value={form.weight_g} onChange={handleChange}
                    type="number" step="0.001" placeholder="Total weight"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                </div>
              </div>

              {(reason === "purchase" || reason === "sale") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹/g)</label>
                  <input name="rate_per_g" value={form.rate_per_g} onChange={handleChange}
                    type="number" step="0.01" placeholder="e.g. 6200"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                </div>
              )}

              {reason === "purchase" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                  <input name="supplier_name" value={form.supplier_name} onChange={handleChange}
                    placeholder="Supplier / vendor"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input name="notes" value={form.notes} onChange={handleChange}
                  placeholder="Optional note…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
              </div>

              <Button type="submit" variant="warning" size="full" loading={saving} loadingText="Saving…">
                {`Record ${REASON_LABELS[reason]?.label || "Movement"}`}
              </Button>
            </form>
          </div>

          {/* Movement History */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">History</h2>
              <select
                value={filterItem}
                onChange={e => setFilterItem(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none"
              >
                <option value="">All Items</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            {loading ? (
              <div className="flex justify-center py-10">
                <Spinner size="md" color="amber" center />
              </div>
            ) : movements.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">No movements yet.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {movements.map(m => {
                  const meta = REASON_LABELS[m.movement_reason] || { label: m.movement_type, color: "bg-gray-100 text-gray-700", sign: "±" };
                  const itemName = items.find(i => i.id === m.item_id)?.name || `Item #${m.item_id}`;
                  return (
                    <div key={m.id} className="flex items-start gap-3 text-sm border border-gray-100 rounded-lg p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${meta.color}`}>
                        {m.quantity > 0 ? "+" : ""}{m.quantity}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{itemName}</p>
                        <p className="text-xs text-gray-500">
                          {meta.label}
                          {m.weight_g ? ` · ${m.weight_g}g` : ""}
                          {m.rate_per_g ? ` · ₹${m.rate_per_g}/g` : ""}
                          {m.supplier_name ? ` · ${m.supplier_name}` : ""}
                          {m.notes ? ` · ${m.notes}` : ""}
                        </p>
                      </div>
                      <span className="ml-auto text-xs text-gray-400 shrink-0">
                        {m.created_at ? new Date(m.created_at).toLocaleDateString() : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ShopLayout>
  );
}
