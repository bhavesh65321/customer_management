import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";

const TYPES = [
  { value: "raw_to_pure", label: "Raw metal → Pure metal" },
  { value: "raw_to_cash", label: "Raw metal → Cash" },
  { value: "advance_metal", label: "Advance (metal with shop)" },
  { value: "advance_money", label: "Advance (money for jewellery)" },
];

export default function MetalExchangeNewPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customer_id: "",
    type: "raw_to_pure",
    metal_type: "gold",
    raw_weight: "",
    raw_purity: "",
    pure_weight: "",
    cash_amount: "",
    making_charges: "",
    notes: "",
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/customer/all`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setCustomers(Array.isArray(d) ? d : []))
      .catch(() => setCustomers([]));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const customer_id = parseInt(form.customer_id, 10);
    if (!customer_id || !form.type) {
      setError("Select customer and type.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        customer_id,
        type: form.type,
        metal_type: form.metal_type,
        raw_weight: form.raw_weight ? parseFloat(form.raw_weight) : null,
        raw_purity: form.raw_purity ? parseFloat(form.raw_purity) : null,
        pure_weight: form.pure_weight ? parseFloat(form.pure_weight) : null,
        cash_amount: form.cash_amount ? parseFloat(form.cash_amount) : null,
        making_charges: form.making_charges ? parseFloat(form.making_charges) : null,
        notes: form.notes || null,
      };
      const res = await fetch(`${API_BASE}/api/metal-exchange`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to save");
      }
      navigate("/metal-exchange");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShopLayout>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">New Metal Exchange</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select
              name="customer_id"
              value={form.customer_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metal</label>
            <select
              name="metal_type"
              value={form.metal_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
            </select>
          </div>
          {(form.type === "raw_to_pure" || form.type === "raw_to_cash" || form.type === "advance_metal") && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raw weight (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="raw_weight"
                    value={form.raw_weight}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purity</label>
                  <input
                    type="number"
                    step="0.01"
                    name="raw_purity"
                    value={form.raw_purity}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g. 22"
                  />
                </div>
              </div>
              {form.type === "raw_to_pure" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pure weight given (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="pure_weight"
                    value={form.pure_weight}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}
            </>
          )}
          {(form.type === "raw_to_cash" || form.type === "advance_money") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.type === "advance_money" ? "Advance amount (₹)" : "Cash amount (₹)"}
              </label>
              <input
                type="number"
                step="0.01"
                name="cash_amount"
                value={form.cash_amount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}
          {form.type === "raw_to_pure" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Making charges (₹)</label>
              <input
                type="number"
                step="0.01"
                name="making_charges"
                value={form.making_charges}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}
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
              onClick={() => navigate("/metal-exchange")}
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
