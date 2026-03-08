import React, { useEffect, useState } from "react";
import ShopLayout from "../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../api";

const emptyWorkerForm = {
  name: "",
  email: "",
  password: "",
  designation: "",
  phone: "",
  address: "",
  monthly_pay: "",
  join_date: "",
};

function formatDate(value) {
  if (!value) return "—";
  const d = typeof value === "string" ? value : value?.split?.("T")?.[0] ?? "";
  return d || "—";
}

function formatPay(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—";
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyWorkerForm);
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");

  const fetchWorkers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/workers`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkers(Array.isArray(data) ? data : []);
      } else {
        setWorkers([]);
      }
    } catch {
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const openEdit = (u) => {
    setEditing(u.id);
    setEditForm({
      name: u.name ?? "",
      designation: u.designation ?? "",
      phone: u.phone ?? "",
      address: u.address ?? "",
      monthly_pay: u.monthly_pay != null ? String(u.monthly_pay) : "",
      join_date: formatDate(u.join_date) === "—" ? "" : formatDate(u.join_date),
    });
    setEditError("");
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      designation: form.designation.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      monthly_pay: form.monthly_pay === "" ? null : parseFloat(form.monthly_pay),
      join_date: form.join_date || null,
    };
    try {
      const res = await fetch(`${API_BASE}/api/workers`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Failed to add worker");
      setForm(emptyWorkerForm);
      setShowAdd(false);
      fetchWorkers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError("");
    const payload = {
      name: editForm.name.trim() || null,
      designation: editForm.designation.trim() || null,
      phone: editForm.phone.trim() || null,
      address: editForm.address.trim() || null,
      monthly_pay: editForm.monthly_pay === "" ? null : parseFloat(editForm.monthly_pay),
      join_date: editForm.join_date || null,
    };
    try {
      const res = await fetch(`${API_BASE}/api/workers/${editing}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Failed to update worker");
      setEditing(null);
      fetchWorkers();
    } catch (err) {
      setEditError(err.message);
    }
  };

  return (
    <ShopLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Workers</h1>
          <button
            type="button"
            onClick={() => { setShowAdd(true); setError(""); setForm(emptyWorkerForm); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium shrink-0"
          >
            + Add worker
          </button>
        </div>

        {showAdd && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Add worker</h2>
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
              {error && <p className="text-red-600 text-sm sm:col-span-2">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  minLength={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={form.designation}
                  onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g. Sales, Support"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly pay</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monthly_pay}
                  onChange={(e) => setForm((f) => ({ ...f, monthly_pay: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Join date</label>
                <input
                  type="date"
                  value={form.join_date}
                  onChange={(e) => setForm((f) => ({ ...f, join_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Add worker
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setError(""); }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : workers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No workers found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly pay</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.designation || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate" title={u.address || ""}>{u.address || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(u.join_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatPay(u.monthly_pay)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {editing != null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Edit worker</h2>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  {editError && <p className="text-red-600 text-sm">{editError}</p>}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                    <input
                      type="text"
                      value={editForm.designation}
                      onChange={(e) => setEditForm((f) => ({ ...f, designation: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      value={editForm.address}
                      onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly pay</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.monthly_pay}
                      onChange={(e) => setEditForm((f) => ({ ...f, monthly_pay: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Join date</label>
                    <input
                      type="date"
                      value={editForm.join_date}
                      onChange={(e) => setEditForm((f) => ({ ...f, join_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditing(null); setEditError(""); }}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </ShopLayout>
  );
}
