import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import CustomerSelectWithAdd from "../../components/ui/CustomerSelectWithAdd";
import { API_BASE, authHeaders } from "../../api";
import InlineError from "../../components/ui/InlineError";

export default function OrdersNewPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [karigars, setKarigars] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  const [form, setForm] = useState({
    customer_id: "",
    type: "new_order",
    description: "",
    item_description: "",
    expected_date: "",
    karigar_id: "",
    workflow_template_id: "",
    advance_cash: "",
    advance_metal_type: "",
    advance_metal_weight: "",
    advance_metal_purity: "",
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/karigars`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setKarigars(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch(`${API_BASE}/api/workflow-templates`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setWorkflows(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const filteredWorkflows = workflows.filter(
    (w) => w.order_type === "both" || w.order_type === form.type
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "type") {
      setForm((f) => ({ ...f, type: value, workflow_template_id: "" }));
      setSelectedWorkflow(null);
      return;
    }
    if (name === "workflow_template_id") {
      setSelectedWorkflow(workflows.find((w) => String(w.id) === value) || null);
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const customer_id = parseInt(form.customer_id, 10);
    if (!customer_id) { setError("Select a customer."); return; }
    setSaving(true);
    try {
      const body = {
        customer_id,
        type: form.type,
        description: form.description.trim() || null,
        item_description: form.type === "repair" ? (form.item_description.trim() || null) : null,
        expected_date: form.expected_date || null,
        karigar_id: form.karigar_id ? parseInt(form.karigar_id, 10) : null,
        workflow_template_id: form.workflow_template_id ? parseInt(form.workflow_template_id, 10) : null,
        advance_cash: form.advance_cash ? parseFloat(form.advance_cash) : null,
        advance_metal_type: form.advance_metal_type || null,
        advance_metal_weight: form.advance_metal_weight ? parseFloat(form.advance_metal_weight) : null,
        advance_metal_purity: form.advance_metal_purity ? parseFloat(form.advance_metal_purity) : null,
      };
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to create");
      }
      const order = await res.json();
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasAdvanceMetal = Boolean(form.advance_metal_type);

  return (
    <ShopLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/orders")} className="text-gray-400 hover:text-gray-600">← Back</button>
          <h1 className="text-xl font-bold text-gray-900">New Order / Repair</h1>
        </div>
        {error && (
          <InlineError message={error} onDismiss={() => setError("")} />
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Basic Info</h2>
            <CustomerSelectWithAdd
              id="order-customer"
              value={form.customer_id}
              onChange={(v) => setForm((f) => ({ ...f, customer_id: v }))}
              required
              label="Customer *"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <div className="flex gap-3">
                {[{ value: "new_order", label: "✨ New Order" }, { value: "repair", label: "🔧 Repair" }].map((opt) => (
                  <label key={opt.value} className={`flex-1 flex items-center justify-center border-2 rounded-xl py-3 cursor-pointer text-sm font-medium transition-colors ${form.type === opt.value ? "border-amber-500 bg-amber-50 text-amber-800" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                    <input type="radio" name="type" value={opt.value} checked={form.type === opt.value} onChange={handleChange} className="hidden" />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Details</h2>
            {form.type === "repair" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item brought for repair</label>
                <textarea name="item_description" value={form.item_description} onChange={handleChange} rows={2} placeholder="e.g. Gold chain – clasp broken" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{form.type === "repair" ? "Additional notes" : "Order description"}</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder={form.type === "repair" ? "Special instructions…" : "e.g. 22K ring, size 16"} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected date</label>
                <input type="date" name="expected_date" value={form.expected_date} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Karigar (optional)</label>
                <select name="karigar_id" value={form.karigar_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="">— None —</option>
                  {karigars.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Workflow */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Workflow</h2>
              <a href="/orders/workflows" target="_blank" rel="noreferrer" className="text-xs text-amber-600 hover:underline">Manage templates →</a>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workflow template (optional)</label>
              <select name="workflow_template_id" value={form.workflow_template_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                <option value="">— No workflow (simple order) —</option>
                {filteredWorkflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            {selectedWorkflow?.steps?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700 mb-2">Steps that will be created:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedWorkflow.steps.map((s, i) => (
                    <span key={s.id} className="text-xs bg-white border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                      {i + 1}. {s.step_name}{s.karigar_name && <span className="text-amber-500"> ({s.karigar_name})</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Advance */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Advance Received</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cash advance (₹)</label>
              <input type="number" name="advance_cash" value={form.advance_cash} onChange={handleChange} placeholder="0" min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metal advance</label>
              <div className="grid grid-cols-3 gap-3">
                <select name="advance_metal_type" value={form.advance_metal_type} onChange={handleChange} className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="">No metal</option>
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                </select>
                {hasAdvanceMetal && (
                  <>
                    <input type="number" name="advance_metal_weight" value={form.advance_metal_weight} onChange={handleChange} placeholder="Weight (g)" min="0" step="0.001" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <input type="number" name="advance_metal_purity" value={form.advance_metal_purity} onChange={handleChange} placeholder="Purity %" min="0" max="100" step="0.01" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pb-4">
            <button type="button" onClick={() => navigate("/orders")} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold transition-colors">
              {saving ? "Creating…" : "Create Order"}
            </button>
          </div>
        </form>
      </div>
    </ShopLayout>
  );
}
