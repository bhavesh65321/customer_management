import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";

export default function GirviNewPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customer_id: "",
    jewelry_description: "",
    gross_weight: "",
    purity: "",
    principal_amount: "",
    interest_rate_per_month: "",
    start_date: new Date().toISOString().slice(0, 10),
    notes: "",
    photo_urls: "",
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
    const principal = parseFloat(form.principal_amount);
    const rate = parseFloat(form.interest_rate_per_month);
    if (!customer_id || !form.jewelry_description || !principal || !rate || !form.start_date) {
      setError("Please fill Customer, Description, Principal, Interest % and Start date.");
      return;
    }
    setLoading(true);
    try {
      const photo_urls = form.photo_urls
        ? form.photo_urls.split(/\s+/).map((s) => s.trim()).filter(Boolean)
        : [];
      const res = await fetch(`${API_BASE}/api/girvi`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          customer_id,
          jewelry_description: form.jewelry_description,
          gross_weight: form.gross_weight ? parseFloat(form.gross_weight) : null,
          purity: form.purity ? parseFloat(form.purity) : null,
          principal_amount: principal,
          interest_rate_per_month: rate,
          start_date: form.start_date,
          notes: form.notes || null,
          photo_urls,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create loan");
      }
      navigate("/girvi");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShopLayout>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">New Girvi</h1>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Jewelry description *</label>
            <textarea
              name="jewelry_description"
              value={form.jewelry_description}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g. Gold chain, 22K"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gross weight (g)</label>
              <input
                type="number"
                step="0.01"
                name="gross_weight"
                value={form.gross_weight}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purity</label>
              <input
                type="number"
                step="0.01"
                name="purity"
                value={form.purity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. 22"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loan amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                name="principal_amount"
                value={form.principal_amount}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interest % per month *</label>
              <input
                type="number"
                step="0.01"
                name="interest_rate_per_month"
                value={form.interest_rate_per_month}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. 1.5"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start date *</label>
            <input
              type="date"
              name="start_date"
              value={form.start_date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo URLs (one per line)</label>
            <textarea
              name="photo_urls"
              value={form.photo_urls}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Paste image URLs if any"
            />
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
              {loading ? "Saving..." : "Save Girvi"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/girvi")}
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
