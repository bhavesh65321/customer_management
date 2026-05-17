import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { parseApiError } from "../../utils/apiError";
import PageLoader from "../../components/ui/PageLoader";

const PURITY_OPTIONS = {
  gold: [
    { label: "24K — 99.9%", value: 99.9 },
    { label: "22K — 91.6%", value: 91.6 },
    { label: "18K — 75.0%", value: 75.0 },
    { label: "14K — 58.5%", value: 58.5 },
  ],
  silver: [
    { label: "999 — 99.9%", value: 99.9 },
    { label: "925 Sterling — 92.5%", value: 92.5 },
    { label: "800 — 80.0%", value: 80.0 },
  ],
};

export default function StockEditItemPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/stock/items/${itemId}`, { headers: authHeaders() }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/api/stock/categories`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
    ]).then(([item, cats]) => {
      if (!item) { navigate("/stock"); return; }
      setCategories(Array.isArray(cats) ? cats : []);
      setForm({
        name: item.name || "",
        category_id: item.category_id ? String(item.category_id) : "",
        metal_type: item.metal_type || "",
        purity_percent: item.purity_percent != null ? String(item.purity_percent) : "",
        gross_weight_g: item.gross_weight_g != null ? String(item.gross_weight_g) : "",
        net_weight_g: item.net_weight_g != null ? String(item.net_weight_g) : "",
        huid: item.huid || "",
        stone_details: item.stone_details || "",
        making_charge_per_g: item.making_charge_per_g != null ? String(item.making_charge_per_g) : "",
        unit: item.unit || "piece",
        min_quantity: item.min_quantity != null ? String(item.min_quantity) : "",
        reorder_weight_g: item.reorder_weight_g != null ? String(item.reorder_weight_g) : "",
        description: item.description || "",
        unit_price: item.unit_price != null ? String(item.unit_price) : "",
      });
      setLoading(false);
    });
  }, [itemId, navigate]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    const res = await fetch(`${API_BASE}/api/stock/categories`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: newCatName.trim(), icon: newCatIcon.trim() || null }),
    });
    if (res.ok) {
      const cat = await res.json();
      setCategories(prev => [...prev, cat]);
      setForm(f => ({ ...f, category_id: String(cat.id) }));
      setNewCatName(""); setNewCatIcon("");
    }
    setAddingCat(false);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Item name is required."); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        category_id: form.category_id ? parseInt(form.category_id) : null,
        metal_type: form.metal_type || null,
        purity_percent: form.purity_percent ? parseFloat(form.purity_percent) : null,
        gross_weight_g: form.gross_weight_g ? parseFloat(form.gross_weight_g) : null,
        net_weight_g: form.net_weight_g ? parseFloat(form.net_weight_g) : null,
        huid: form.huid.trim() || null,
        stone_details: form.stone_details.trim() || null,
        making_charge_per_g: form.making_charge_per_g ? parseFloat(form.making_charge_per_g) : null,
        unit: form.unit,
        min_quantity: form.min_quantity ? parseFloat(form.min_quantity) : null,
        reorder_weight_g: form.reorder_weight_g ? parseFloat(form.reorder_weight_g) : null,
        description: form.description.trim() || null,
        unit_price: form.unit_price ? parseFloat(form.unit_price) : null,
      };
      const res = await fetch(`${API_BASE}/api/stock/items/${itemId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(parseApiError(d, "Failed to update item. Please try again."));
      }
      navigate("/stock");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  const purities = PURITY_OPTIONS[form.metal_type] || [];

  return (
    <ShopLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/stock")} className="text-gray-400 hover:text-gray-600">← Back</button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Edit Item</h1>
            <p className="text-sm text-gray-500">{form.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Basic Info</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
              <input name="name" value={form.name} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input name="description" value={form.description} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select name="category_id" value={form.category_id} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
                <option value="">No category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</option>
                ))}
              </select>
              <div className="flex gap-2 mt-2">
                <input value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} placeholder="Emoji"
                  className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none" />
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="New category…"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none" />
                <button type="button" onClick={addCategory} disabled={addingCat || !newCatName.trim()}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-50">
                  {addingCat ? "…" : "Add"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Metal & Purity</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metal Type</label>
                <select name="metal_type" value={form.metal_type} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
                  <option value="">None</option>
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                  <option value="diamond">Diamond</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purity</label>
                {purities.length > 0 ? (
                  <select name="purity_percent" value={form.purity_percent} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
                    {purities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                ) : (
                  <input name="purity_percent" value={form.purity_percent} onChange={handleChange}
                    placeholder="e.g. 91.6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gross Weight (g)</label>
                <input name="gross_weight_g" value={form.gross_weight_g} onChange={handleChange}
                  type="number" step="0.001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Net Weight (g)</label>
                <input name="net_weight_g" value={form.net_weight_g} onChange={handleChange}
                  type="number" step="0.001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">HUID</label>
                <input name="huid" value={form.huid} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Making Charge (₹/g)</label>
                <input name="making_charge_per_g" value={form.making_charge_per_g} onChange={handleChange}
                  type="number" step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stone Details</label>
              <input name="stone_details" value={form.stone_details} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Inventory Settings</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select name="unit" value={form.unit} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
                  <option value="piece">piece</option>
                  <option value="gram">gram</option>
                  <option value="set">set</option>
                  <option value="pair">pair</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Qty Alert</label>
                <input name="min_quantity" value={form.min_quantity} onChange={handleChange}
                  type="number" step="0.001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Weight (g)</label>
                <input name="reorder_weight_g" value={form.reorder_weight_g} onChange={handleChange}
                  type="number" step="0.001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹)</label>
              <input name="unit_price" value={form.unit_price} onChange={handleChange}
                type="number" step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate("/stock")}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </ShopLayout>
  );
}
