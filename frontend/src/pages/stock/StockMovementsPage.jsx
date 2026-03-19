import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";

const MOVEMENT_TYPES = [
  { value: "purchase", label: "Purchase / Add stock" },
  { value: "sale", label: "Sale (reduce)" },
  { value: "return", label: "Return" },
  { value: "order_use", label: "Used in order" },
  { value: "adjust", label: "Adjustment" },
];

export default function StockMovementsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    item_id: "",
    quantity: "",
    movement_type: "purchase",
    notes: "",
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/stock/items`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const item_id = parseInt(form.item_id, 10);
    const quantity = parseFloat(form.quantity);
    if (!item_id || !quantity || quantity <= 0) {
      setError("Select item and enter a positive quantity.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/stock/movements`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          item_id,
          quantity: form.movement_type === "sale" || form.movement_type === "order_use" ? quantity : quantity,
          movement_type: form.movement_type,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to save");
      }
      setForm((f) => ({ ...f, quantity: "", notes: "" }));
      navigate("/stock");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShopLayout>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Stock In / Out</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
            <select
              name="item_id"
              value={form.item_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select item</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.quantity} {i.unit})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              name="movement_type"
              value={form.movement_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Number of pieces or grams"
            />
            <p className="mt-1 text-xs text-gray-500">
              For Sale / Used in order, stock will be reduced by this amount.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/stock")}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </ShopLayout>
  );
}
