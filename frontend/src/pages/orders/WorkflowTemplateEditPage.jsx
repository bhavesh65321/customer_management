import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import PageLoader from "../../components/ui/PageLoader";
import InlineError from "../../components/ui/InlineError";

const EMPTY_STEP = { step_name: "", karigar_id: "" };

export default function WorkflowTemplateEditPage() {
  const { templateId } = useParams();
  const isEdit = Boolean(templateId);
  const navigate = useNavigate();

  const [karigars, setKarigars] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [orderType, setOrderType] = useState("both");
  const [steps, setSteps] = useState([{ ...EMPTY_STEP }]);

  useEffect(() => {
    fetch(`${API_BASE}/api/karigars`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setKarigars(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    fetch(`${API_BASE}/api/workflow-templates/${templateId}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((t) => {
        setName(t.name);
        setOrderType(t.order_type);
        setSteps(
          t.steps?.length
            ? t.steps.map((s) => ({ step_name: s.step_name, karigar_id: s.karigar_id ? String(s.karigar_id) : "" }))
            : [{ ...EMPTY_STEP }]
        );
      })
      .catch(() => setError("Could not load template"))
      .finally(() => setLoading(false));
  }, [templateId, isEdit]);

  const addStep = () => setSteps((prev) => [...prev, { ...EMPTY_STEP }]);
  const removeStep = (idx) => setSteps((prev) => prev.filter((_, i) => i !== idx));
  const updateStep = (idx, field, value) =>
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  const moveStep = (idx, dir) => {
    const next = [...steps];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setSteps(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Template name is required"); return; }
    if (steps.some((s) => !s.step_name.trim())) { setError("All steps need a name"); return; }
    setSaving(true);
    const body = {
      name: name.trim(),
      order_type: orderType,
      steps: steps.map((s, i) => ({
        step_order: i + 1,
        step_name: s.step_name.trim(),
        karigar_id: s.karigar_id ? parseInt(s.karigar_id, 10) : null,
      })),
    };
    try {
      const url = isEdit
        ? `${API_BASE}/api/workflow-templates/${templateId}`
        : `${API_BASE}/api/workflow-templates`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to save");
      }
      navigate("/orders/workflows");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <ShopLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/orders/workflows")} className="text-gray-400 hover:text-gray-600">
            ← Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? "Edit Workflow Template" : "New Workflow Template"}
          </h1>
        </div>

        {error && (
          <InlineError message={error} onDismiss={() => setError("")} />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Template Info</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard Repair Workflow"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Applies To</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="both">Both (New Orders & Repairs)</option>
                <option value="new_order">New Orders only</option>
                <option value="repair">Repairs only</option>
              </select>
            </div>
          </div>

          {/* Steps */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                Steps ({steps.length})
              </h2>
              <button
                type="button"
                onClick={addStep}
                className="text-sm text-amber-700 hover:text-amber-800 font-medium"
              >
                + Add Step
              </button>
            </div>

            <div className="space-y-3">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 group">
                  {/* Order number */}
                  <span className="text-xs text-gray-400 font-mono w-5 shrink-0 text-center">{idx + 1}</span>

                  {/* Step name */}
                  <input
                    type="text"
                    value={step.step_name}
                    onChange={(e) => updateStep(idx, "step_name", e.target.value)}
                    placeholder="Step name (e.g. Polish, Setting, QC)"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />

                  {/* Karigar */}
                  <select
                    value={step.karigar_id}
                    onChange={(e) => updateStep(idx, "karigar_id", e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 max-w-[140px]"
                  >
                    <option value="">No karigar</option>
                    {karigars.map((k) => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </select>

                  {/* Move up/down */}
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => moveStep(idx, -1)} disabled={idx === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▲</button>
                    <button type="button" onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▼</button>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    disabled={steps.length === 1}
                    className="text-red-400 hover:text-red-600 disabled:opacity-20 text-lg leading-none"
                  >×</button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addStep}
              className="mt-4 w-full border-2 border-dashed border-gray-200 hover:border-amber-300 text-gray-400 hover:text-amber-600 rounded-lg py-2 text-sm transition-colors"
            >
              + Add another step
            </button>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/orders/workflows")}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Template"}
            </button>
          </div>
        </form>
      </div>
    </ShopLayout>
  );
}
