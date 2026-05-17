import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";

const ORDER_TYPE_LABELS = {
  new_order: "New Order",
  repair: "Repair",
  both: "Both",
};

export default function WorkflowTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/workflow-templates`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTemplates(Array.isArray(d) ? d : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this workflow template? Orders using it won't be affected.")) return;
    setDeleting(id);
    try {
      await fetch(`${API_BASE}/api/workflow-templates/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      load();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <ShopLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workflow Templates</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Define step-by-step workflows for orders & repairs
            </p>
          </div>
          <button
            onClick={() => navigate("/orders/workflows/new")}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <span className="text-lg leading-none">+</span> New Template
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
            <div className="text-4xl mb-3">🔧</div>
            <div className="text-gray-600 font-medium">No workflow templates yet</div>
            <p className="text-sm text-gray-400 mt-1">
              Create a template to auto-generate steps for new orders
            </p>
            <button
              onClick={() => navigate("/orders/workflows/new")}
              className="mt-4 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              Create First Template
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold text-gray-900">{t.name}</h2>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        {ORDER_TYPE_LABELS[t.order_type] || t.order_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {t.steps?.length || 0} step{t.steps?.length !== 1 ? "s" : ""}
                    </p>
                    {/* Step preview */}
                    {t.steps?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {t.steps.map((s, idx) => (
                          <div key={s.id} className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                            <span className="text-gray-400 font-mono">{idx + 1}.</span>
                            {s.step_name}
                            {s.karigar_name && (
                              <span className="text-gray-400">({s.karigar_name})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4 shrink-0">
                    <button
                      onClick={() => navigate(`/orders/workflows/${t.id}/edit`)}
                      className="text-sm text-amber-700 hover:text-amber-800 border border-amber-200 hover:border-amber-400 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting === t.id}
                      className="text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                    >
                      {deleting === t.id ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ShopLayout>
  );
}
