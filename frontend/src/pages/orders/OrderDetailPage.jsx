import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { parseApiError } from "../../utils/apiError";
import PageLoader from "../../components/ui/PageLoader";
import InlineError from "../../components/ui/InlineError";

const STATUS_ORDER = ["pending", "in_progress", "ready", "delivered"];
const STATUS_LABELS = { pending: "Received", in_progress: "In Progress", ready: "Ready to Collect", delivered: "Delivered" };
const STATUS_COLORS = {
  pending: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  ready: "bg-green-100 text-green-700",
  delivered: "bg-amber-100 text-amber-700",
};

// Inline "Mark Done" form shown below each pending step
function StepDoneForm({ step, orderId, onSaved, onCancel }) {
  const [charge, setCharge] = useState("");
  const [metalLoss, setMetalLoss] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setSaving(true); setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/steps/${step.id}/done`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          bypass: false,
          karigar_charge: charge ? parseFloat(charge) : null,
          metal_loss_weight: metalLoss ? parseFloat(metalLoss) : null,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(parseApiError(d, "Failed to advance step. Please try again.")); }
      onSaved();
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <div className="mt-2 ml-9 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-amber-800">Mark "{step.step_name}" as done</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Karigar charge (₹)</label>
          <input
            type="number" value={charge} onChange={e => setCharge(e.target.value)}
            placeholder="0" min="0" step="0.01"
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Metal loss (grams)</label>
          <input
            type="number" value={metalLoss} onChange={e => setMetalLoss(e.target.value)}
            placeholder="0.000" min="0" step="0.001"
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200">Cancel</button>
        <button onClick={submit} disabled={saving}
          className="text-xs bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg font-semibold disabled:opacity-40">
          {saving ? "Saving…" : "✓ Mark Done"}
        </button>
      </div>
    </div>
  );
}

// Inline "Skip step" form
function StepSkipForm({ step, orderId, onSaved, onCancel }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const res = await fetch(`${API_BASE}/api/orders/${orderId}/steps/${step.id}/done`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ bypass: true, bypass_reason: reason || null }),
    });
    if (res.ok) onSaved();
    else setSaving(false);
  };

  return (
    <div className="mt-2 ml-9 bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-orange-800">Skip "{step.step_name}"</p>
      <input type="text" value={reason} onChange={e => setReason(e.target.value)}
        placeholder="Reason (e.g. customer waived this step)"
        className="w-full border border-orange-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
      <div className="flex gap-2">
        <button onClick={onCancel} className="text-xs text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200">Cancel</button>
        <button onClick={submit} disabled={saving}
          className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg font-semibold disabled:opacity-40">
          {saving ? "…" : "Skip Step"}
        </button>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [karigars, setKarigars] = useState([]);
  const [activeForm, setActiveForm] = useState(null); // { stepId, type: 'done'|'skip' }

  const [form, setForm] = useState({
    status: "", amount_charged: "", expected_date: "", description: "", item_description: "", karigar_id: "",
  });

  const loadOrder = useCallback(() => {
    fetch(`${API_BASE}/api/orders/${orderId}`, { headers: authHeaders() })
      .then(r => { if (r.status === 401) { navigate("/login"); return null; } return r.ok ? r.json() : Promise.reject(); })
      .then(o => {
        if (!o) return;
        setOrder(o);
        setForm({
          status: o.status || "pending",
          amount_charged: o.amount_charged != null ? String(o.amount_charged) : "",
          expected_date: o.expected_date ? o.expected_date.slice(0, 10) : "",
          description: o.description || "",
          item_description: o.item_description || "",
          karigar_id: o.karigar_id != null ? String(o.karigar_id) : "",
        });
      })
      .catch(() => setError("Could not load order."))
      .finally(() => setLoading(false));
  }, [orderId, navigate]);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    loadOrder();
    fetch(`${API_BASE}/api/karigars`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : []).then(d => setKarigars(Array.isArray(d) ? d : [])).catch(() => {});
  }, [orderId, loadOrder]);

  const handleSave = async e => {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({
          status: form.status,
          amount_charged: form.amount_charged ? parseFloat(form.amount_charged) : null,
          expected_date: form.expected_date || null,
          description: form.description.trim() || null,
          item_description: form.item_description.trim() || null,
          karigar_id: form.karigar_id ? parseInt(form.karigar_id, 10) : null,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(parseApiError(d, "Failed to save order. Please try again.")); }
      loadOrder();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  if (loading) return <PageLoader />;
  if (!order) return <ShopLayout><div className="text-center py-20 text-red-500">{error || "Order not found"}</div></ShopLayout>;

  const steps = order.order_steps || [];
  const completedSteps = steps.filter(s => s.is_done || s.is_bypassed).length;
  const totalKarigarCharge = steps.reduce((sum, s) => sum + (s.karigar_charge || 0), 0);
  const totalMetalLoss = steps.reduce((sum, s) => sum + (s.metal_loss_weight || 0), 0);
  const hasWorkflow = steps.length > 0;
  const allStepsDone = hasWorkflow && completedSteps === steps.length;
  const canCreateBill = order.status === "ready";

  return (
    <ShopLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <button onClick={() => navigate("/orders")} className="text-gray-400 hover:text-gray-600 text-sm mb-1 block">&larr; Orders</button>
            <h1 className="text-xl font-bold text-gray-900">
              {order.type === "repair" ? "Repair" : "Order"} #{order.id}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                {STATUS_LABELS[order.status] || order.status}
              </span>
              {order.customer_name && (
                <Link to={`/customers/${order.customer_id}`} className="text-sm text-amber-700 hover:underline font-medium">
                  {order.customer_name}
                </Link>
              )}
            </div>
          </div>
          <div className="shrink-0">
            {canCreateBill ? (
              <Link to={`/shop?customerId=${order.customer_id}&orderId=${orderId}`}
                className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg block text-center">
                🧾 Create Bill
              </Link>
            ) : (
              <div className="relative group">
                <button disabled className="bg-gray-200 text-gray-400 text-sm font-semibold px-4 py-2 rounded-lg cursor-not-allowed">
                  🧾 Create Bill
                </button>
                <div className="absolute right-0 top-10 bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {hasWorkflow ? "Complete all steps first" : "Change status to Ready to Collect"}
                </div>
              </div>
            )}
          </div>
        </div>

        {error && <InlineError message={error} onDismiss={() => setError("")} />}

        {/* ORDER INFO - full width on top */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Order Info</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            {order.customer_name && (
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Customer</p>
                <Link to={`/customers/${order.customer_id}`} className="font-semibold text-amber-700 hover:underline">{order.customer_name}</Link>
              </div>
            )}
            {order.item_description && (
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Item</p>
                <p className="font-medium text-gray-800">{order.item_description}</p>
              </div>
            )}
            {order.karigar_name && (
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Karigar</p>
                <p className="font-medium text-gray-800">{order.karigar_name}</p>
              </div>
            )}
            {order.expected_date && (
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Expected</p>
                <p className="font-medium text-gray-800">{order.expected_date.slice(0, 10)}</p>
              </div>
            )}
            {order.amount_charged && (
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Amount</p>
                <p className="font-bold text-gray-900">{Number(order.amount_charged).toLocaleString("en-IN")}</p>
              </div>
            )}
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Created</p>
              <p className="font-medium text-gray-700">{new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
            </div>
            {order.description && (
              <div className="col-span-2">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Description</p>
                <p className="font-medium text-gray-800">{order.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* WORKFLOW STEPS - full width, medium size */}
        {hasWorkflow && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-gray-800 text-base">Workflow Steps</h2>
              <span className="text-sm text-gray-400 font-medium bg-gray-50 px-3 py-1 rounded-full">{completedSteps}/{steps.length} done</span>
            </div>

            <div className={steps.length > 6 ? "overflow-x-auto" : ""}>
              <div className="flex items-start" style={{ minWidth: steps.length > 6 ? `${steps.length * 140}px` : "100%" }}>
                {steps.map((step, idx) => {
                  const done = step.is_done || step.is_bypassed;
                  const isLast = idx === steps.length - 1;
                  const isActive = !done && steps.slice(0, idx).every(s => s.is_done || s.is_bypassed);
                  return (
                    <div key={step.id} className="flex-1 flex flex-col items-center relative min-w-0">
                      {idx > 0 && (
                        <div className={`absolute left-0 top-[22px] w-1/2 h-0.5 ${steps[idx-1]?.is_done || steps[idx-1]?.is_bypassed ? "bg-green-400" : "bg-gray-200"}`} />
                      )}
                      {!isLast && (
                        <div className={`absolute right-0 top-[22px] w-1/2 h-0.5 ${done ? "bg-green-400" : "bg-gray-200"}`} />
                      )}
                      <div className={`relative z-10 w-11 h-11 rounded-full border-2 flex items-center justify-center font-bold text-sm shadow-sm transition-all ${
                        done ? "border-green-500 bg-green-500 text-white"
                        : isActive ? "border-amber-500 bg-amber-50 text-amber-700 ring-4 ring-amber-100"
                        : "border-gray-300 bg-white text-gray-400"
                      }`}>
                        {step.is_bypassed ? "skip" : step.is_done ? "done" : idx + 1}
                      </div>
                      <div className="mt-3 px-2 text-center w-full">
                        <p className={`text-xs font-semibold leading-snug ${done ? "text-green-700" : isActive ? "text-amber-700" : "text-gray-500"}`}>
                          {step.step_name}
                        </p>
                        {step.karigar_name && <p className="text-[11px] text-gray-400 mt-0.5">{step.karigar_name}</p>}
                        {step.is_bypassed && <p className="text-[11px] text-orange-500 italic">skipped</p>}
                        {done && (step.karigar_charge > 0 || step.metal_loss_weight > 0) && (
                          <div className="mt-1.5 space-y-0.5">
                            {step.karigar_charge > 0 && <p className="text-xs text-amber-700 font-bold">{step.karigar_charge.toLocaleString("en-IN")}</p>}
                            {step.metal_loss_weight > 0 && <p className="text-xs text-blue-600 font-semibold">-{step.metal_loss_weight}g</p>}
                          </div>
                        )}
                        {!done && (
                          <div className="flex gap-1 mt-3 justify-center flex-wrap">
                            <button
                              onClick={() => setActiveForm(activeForm?.stepId === step.id && activeForm?.type === "done" ? null : { stepId: step.id, type: "done" })}
                              className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-semibold shadow-sm">
                              Done
                            </button>
                            <button
                              onClick={() => setActiveForm(activeForm?.stepId === step.id && activeForm?.type === "skip" ? null : { stepId: step.id, type: "skip" })}
                              className="text-xs border border-orange-300 text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg">
                              Skip
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {steps.map(step => {
              const showDoneForm = activeForm?.stepId === step.id && activeForm?.type === "done";
              const showSkipForm = activeForm?.stepId === step.id && activeForm?.type === "skip";
              if (!showDoneForm && !showSkipForm) return null;
              return (
                <div key={`form-${step.id}`} className="mt-5 border-t border-gray-100 pt-5">
                  {showDoneForm && (
                    <StepDoneForm step={step} orderId={orderId}
                      onSaved={() => { setActiveForm(null); loadOrder(); }}
                      onCancel={() => setActiveForm(null)} />
                  )}
                  {showSkipForm && (
                    <StepSkipForm step={step} orderId={orderId}
                      onSaved={() => { setActiveForm(null); loadOrder(); }}
                      onCancel={() => setActiveForm(null)} />
                  )}
                </div>
              );
            })}

            {completedSteps > 0 && (totalKarigarCharge > 0 || totalMetalLoss > 0) && (
              <div className="mt-5 pt-4 border-t border-gray-100 flex gap-8 flex-wrap">
                {totalKarigarCharge > 0 && (
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">Total karigar charges</p>
                    <p className="font-bold text-amber-700 text-lg mt-0.5">{totalKarigarCharge.toLocaleString("en-IN")}</p>
                  </div>
                )}
                {totalMetalLoss > 0 && (
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">Total metal lost</p>
                    <p className="font-bold text-blue-700 text-lg mt-0.5">{totalMetalLoss.toFixed(3)}g</p>
                  </div>
                )}
              </div>
            )}

            {allStepsDone && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-semibold text-center">
                All steps complete - Ready to Collect
              </div>
            )}
          </div>
        )}

        {/* BOTTOM ROW: Advance Received + Manual Override */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {order.advance_cash || order.advance_metal_type ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-700 mb-3">Advance Received</h2>
              <div className="space-y-2">
                {order.advance_cash && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Cash advance</span>
                    <span className="font-bold text-gray-900">{Number(order.advance_cash).toLocaleString("en-IN")}</span>
                  </div>
                )}
                {order.advance_metal_type && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 capitalize">{order.advance_metal_type} metal</span>
                    <span className="font-bold text-gray-900">
                      {order.advance_metal_weight}g
                      {order.advance_metal_purity && <span className="text-gray-400 font-normal"> @ {order.advance_metal_purity}%</span>}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-5 flex items-center justify-center text-sm text-gray-300">
              No advance recorded
            </div>
          )}

          <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-700">{hasWorkflow ? "Manual Override" : "Update Order"}</h2>
              {hasWorkflow && <p className="text-xs text-gray-400 mt-0.5">Status is auto-managed by workflow. Override here if needed.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount charged</label>
                <input type="number" value={form.amount_charged} onChange={e => setForm(f => ({ ...f, amount_charged: e.target.value }))}
                  placeholder="0" min="0" step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Expected date</label>
                <input type="date" value={form.expected_date} onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Karigar</label>
                <select value={form.karigar_id} onChange={e => setForm(f => ({ ...f, karigar_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="">None</option>
                  {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-semibold transition-colors">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

      </div>
    </ShopLayout>
  );
}
