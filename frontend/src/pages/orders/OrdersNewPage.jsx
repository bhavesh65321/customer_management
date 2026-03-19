import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import CustomerSelectWithAdd from "../../components/ui/CustomerSelectWithAdd";
import { API_BASE, authHeaders } from "../../api";

export default function OrdersNewPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customer_id: "",
    type: "new_order",
    description: "",
    item_description: "",
    expected_date: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const customer_id = parseInt(form.customer_id, 10);
    if (!customer_id) {
      setError("Select a customer.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          customer_id,
          type: form.type,
          description: form.description || null,
          item_description: form.type === "repair" ? form.item_description || null : null,
          expected_date: form.expected_date || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create");
      }
      navigate("/orders");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShopLayout>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">New Order / Repair</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
          )}
          <CustomerSelectWithAdd
            id="orders-customer_id"
            value={form.customer_id}
            onChange={(v) => setForm((f) => ({ ...f, customer_id: v }))}
            required
            label="Customer *"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="new_order">New order</option>
              <option value="repair">Repair</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.type === "repair" ? "Item brought for repair" : "Order description"}
            </label>
            <textarea
              name={form.type === "repair" ? "item_description" : "description"}
              value={form.type === "repair" ? form.item_description : form.description}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder={form.type === "repair" ? "e.g. Gold chain - link repair" : "e.g. 22K ring"}
            />
          </div>
          {form.type === "new_order" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="What the customer wants"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected date</label>
            <input
              type="date"
              name="expected_date"
              value={form.expected_date}
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
              onClick={() => navigate("/orders")}
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
