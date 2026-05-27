import React, { useEffect, useState } from "react";
import ShopLayout from "../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../api";
import { parseApiError } from "../utils/apiError";
import { Spinner } from "../components/ui/Spinner";
import InlineError from "../components/ui/InlineError";

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtDate = (s) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtPay = (n) =>
  n != null && n !== "" && Number(n) > 0
    ? `₹${Number(n).toLocaleString("en-IN")}`
    : "—";

const ROLE_COLORS = {
  manager: "bg-purple-100 text-purple-700 border border-purple-200",
  staff:   "bg-blue-100 text-blue-700 border border-blue-200",
  owner:   "bg-amber-100 text-amber-700 border border-amber-200",
};
// const roleBadge = (role) => role || "staff"; // Reserved for future use

const EMPTY_FORM = {
  name: "", email: "", password: "", designation: "",
  phone: "", address: "", monthly_pay: "", join_date: "",
};

// ── Worker Modal (Add / Edit) ──────────────────────────────────────────────
function WorkerModal({ mode, initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const isEdit = mode === "edit";
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setErr("");
    const payload = {
      name: form.name.trim(),
      designation: form.designation.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      monthly_pay: form.monthly_pay === "" ? null : parseFloat(form.monthly_pay),
      join_date: form.join_date || null,
    };
    if (!isEdit) {
      payload.email = form.email.trim();
      payload.password = form.password;
    }
    try {
      const res = await fetch(
        isEdit ? `${API_BASE}/api/workers/${initial.id}` : `${API_BASE}/api/workers`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseApiError(data, isEdit ? "Failed to update worker." : "Failed to add worker."));
      onSaved();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl mx-4 mb-4 sm:mb-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-gray-900 text-base">{isEdit ? "Edit worker" : "Add new worker"}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEdit ? "Update details below" : "Creates a staff login for this person"}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 text-2xl font-light transition-colors">
            ×
          </button>
        </div>

        <form onSubmit={submit} className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {err && (
            <InlineError message={err} onDismiss={() => setErr("")} />
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Name */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">
                Name *
              </label>
              <input type="text" value={form.name} onChange={f("name")} required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>

            {/* Designation */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">
                Designation
              </label>
              <input type="text" value={form.designation} onChange={f("designation")}
                placeholder="e.g. Sales, Billing"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>

            {/* Email — add only */}
            {!isEdit && (
              <div className="col-span-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">
                  Email * <span className="normal-case font-normal text-gray-400">(used to log in)</span>
                </label>
                <input type="email" value={form.email} onChange={f("email")} required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
            )}

            {/* Password — add only */}
            {!isEdit && (
              <div className="col-span-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">
                  Password *
                </label>
                <input type="password" value={form.password} onChange={f("password")} required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Phone</label>
              <input type="tel" value={form.phone} onChange={f("phone")}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>

            {/* Monthly pay */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Monthly Pay (₹)</label>
              <input type="number" min="0" step="100" value={form.monthly_pay} onChange={f("monthly_pay")}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>

            {/* Join date */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Join Date</label>
              <input type="date" value={form.join_date} onChange={f("join_date")}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>

            {/* Address */}
            <div className="col-span-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Address</label>
              <textarea value={form.address} onChange={f("address")} rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add worker"}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────
function DeleteConfirm({ worker, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");

  async function confirm() {
    setDeleting(true); setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/workers/${worker.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.status === 204 || res.ok) { onDeleted(); return; }
      const data = await res.json().catch(() => ({}));
      throw new Error(parseApiError(data, "Failed to delete worker. Please try again."));
    } catch (ex) {
      setErr(ex.message);
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl mx-4 max-w-sm w-full p-6 space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <p className="font-bold text-gray-900 text-base">Remove {worker.name || worker.email}?</p>
          <p className="text-sm text-gray-500 mt-1">
            This will delete their login. They won't be able to access the system anymore. This cannot be undone.
          </p>
        </div>
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-center">{err}</p>}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={confirm} disabled={deleting}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-sm disabled:opacity-50 transition-colors">
            {deleting ? "Removing…" : "Yes, Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function WorkersPage() {
  const [workers, setWorkers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null); // null | { mode: 'add'|'edit', worker? }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast]           = useState(null);

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/workers`, { headers: authHeaders() });
      if (res.ok) setWorkers(await res.json());
      else setWorkers([]);
    } catch { setWorkers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => setModal({ mode: "add" });
  const openEdit = (w) => setModal({
    mode: "edit",
    worker: {
      id: w.id,
      name: w.name ?? "",
      designation: w.designation ?? "",
      phone: w.phone ?? "",
      address: w.address ?? "",
      monthly_pay: w.monthly_pay != null ? String(w.monthly_pay) : "",
      join_date: w.join_date ? w.join_date.slice(0, 10) : "",
    },
  });

  const onSaved = () => {
    setModal(null);
    showToast(modal?.mode === "edit" ? "✓ Worker updated" : "✓ Worker added");
    load();
  };

  const onDeleted = () => {
    setDeleteTarget(null);
    showToast("✓ Worker removed");
    load();
  };

  return (
    <ShopLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Team</p>
            <h1 className="text-2xl font-extrabold text-gray-900">Workers</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage staff logins, roles, and pay</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors whitespace-nowrap">
            + Add Worker
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
            toast.type === "err"
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-green-50 border border-green-200 text-green-800"}`}>
            {toast.msg}
          </div>
        )}

        {/* Summary stat */}
        {!loading && workers.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Staff",       value: workers.length },
              { label: "With Designation",  value: workers.filter((w) => w.designation).length },
              { label: "With Pay Set",      value: workers.filter((w) => w.monthly_pay > 0).length },
              { label: "Monthly Payroll",   value: `₹${workers.reduce((s, w) => s + (Number(w.monthly_pay) || 0), 0).toLocaleString("en-IN")}` },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{c.label}</p>
                <p className="text-xl font-extrabold text-gray-900">{c.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" center />
            </div>
          ) : workers.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">👷</p>
              <p className="text-gray-600 font-semibold text-sm">No workers added yet</p>
              <p className="text-gray-400 text-sm mt-1">Click "+ Add Worker" to create a staff login</p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["Worker", "Role", "Phone", "Join Date", "Monthly Pay", ""].map((h) => (
                    <th key={h} className={`px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap ${
                      h === "Monthly Pay" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {workers.map((w) => (
                  <tr key={w.id} className="hover:bg-blue-50/30 transition-colors">

                    {/* Worker — avatar + name + email */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
                          {(w.name || w.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{w.name || "—"}</p>
                          <p className="text-xs text-gray-400">{w.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role / Designation */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${ROLE_COLORS[w.role] || ROLE_COLORS.staff}`}>
                          {(w.role || "staff").charAt(0).toUpperCase() + (w.role || "staff").slice(1)}
                        </span>
                        {w.designation && (
                          <p className="text-xs text-gray-400">{w.designation}</p>
                        )}
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {w.phone
                        ? <a href={`tel:${w.phone}`} className="hover:text-blue-600 transition-colors">{w.phone}</a>
                        : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Join Date */}
                    <td className="px-4 py-3 text-sm text-gray-600">{fmtDate(w.join_date)}</td>

                    {/* Monthly Pay */}
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold text-sm ${w.monthly_pay > 0 ? "text-gray-900" : "text-gray-300"}`}>
                        {fmtPay(w.monthly_pay)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(w)}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                          Edit
                        </button>
                        <button onClick={() => setDeleteTarget(w)}
                          title="Remove worker"
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:border-red-300 transition-colors text-xs">
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modals */}
        {modal && (
          <WorkerModal
            mode={modal.mode}
            initial={modal.worker}
            onClose={() => setModal(null)}
            onSaved={onSaved}
          />
        )}
        {deleteTarget && (
          <DeleteConfirm
            worker={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onDeleted={onDeleted}
          />
        )}

      </div>
    </ShopLayout>
  );
}
