import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/ui/BackButton";
import ConfirmDialog from "../components/ui/ConfirmationPop";
import InlineError from "../components/ui/InlineError";
import { API_BASE, authHeaders, getToken, parseJwt } from "../api";
import { formatDate } from "../utils/format";

const emptyForm = {
  name: "",
  join_date: "",
  address: "",
  location: "",
  contact_phone: "",
  is_active: true,
  license_type: "",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");
  const [storeToDelete, setStoreToDelete] = useState(null);
  const [addSuccess, setAddSuccess] = useState(null);

  useEffect(() => {
    const token = getToken();
    const payload = token ? parseJwt(token) : null;
    const isAdmin = token && payload && payload.role === "admin";
    setAuthChecked(true);
    if (!isAdmin) {
      navigate("/home", { replace: true });
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (!authChecked) return;
    const payload = parseJwt(getToken());
    if (payload?.role !== "admin") return;
    fetchStores();
  }, [authChecked]);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/stores`, { headers: authHeaders() });
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (res.status === 403) {
        navigate("/home", { replace: true });
        return;
      }
      const data = await res.json();
      setStores(Array.isArray(data) ? data : []);
    } catch {
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAddSuccess(null);
    const payload = {
      name: form.name.trim(),
      join_date: form.join_date || null,
      address: form.address.trim() || null,
      location: form.location.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      is_active: form.is_active,
      license_type: form.license_type || null,
    };
    if (payload.license_type === "") payload.license_type = null;
    try {
      const res = await fetch(`${API_BASE}/api/admin/stores`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Failed to add company");
      setForm(emptyForm);
      setShowForm(false);
      setAddSuccess({
        companyId: data.id,
        customerId: data.customer_code,
        contactPhone: data.contact_phone,
      });
      fetchStores();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEdit = (s) => {
    setEditing(s.id);
    setEditForm({
      name: s.name ?? "",
      join_date: formatDate(s.join_date) === "—" ? "" : formatDate(s.join_date),
      address: s.address ?? "",
      location: s.location ?? "",
      contact_phone: s.contact_phone ?? "",
      is_active: s.is_active !== false,
      license_type: s.license_type ?? "",
    });
    setEditError("");
  };


  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError("");
    const payload = {
      name: editForm.name.trim(),
      join_date: editForm.join_date || null,
      address: editForm.address.trim() || null,
      location: editForm.location.trim() || null,
      contact_phone: editForm.contact_phone.trim() || null,
      is_active: editForm.is_active,
      license_type: editForm.license_type || null,
    };
    if (payload.license_type === "") payload.license_type = null;
    try {
      const res = await fetch(`${API_BASE}/api/admin/stores/${editing}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Failed to update");
      setEditing(null);
      fetchStores();
    } catch (err) {
      setEditError(err.message);
    }
  };

  const handleDeleteStore = async () => {
    if (!storeToDelete) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/stores/${storeToDelete.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (res.status === 403) {
        navigate("/home", { replace: true });
        return;
      }
      setStoreToDelete(null);
      fetchStores();
    } catch {
      setStoreToDelete(null);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <BackButton to="/home" label="Go to My Shop" />
        </div>
        <p className="text-sm text-gray-500 mb-2">
          Manage onboarded companies using the product. These are product customers, not shop-specific customers.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Admin</h1>
          <button
            type="button"
            onClick={() => { setShowForm(true); setError(""); setForm(emptyForm); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            + Add company
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Add company</h2>
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
              {error && <div className="sm:col-span-2"><InlineError message={error} onDismiss={() => setError("")} className="mb-2" /></div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact phone</label>
                <input
                  type="text"
                  value={form.contact_phone}
                  onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Company phone for registration"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joining date</label>
                <input
                  type="date"
                  value={form.join_date}
                  onChange={(e) => setForm((f) => ({ ...f, join_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License type</label>
                <select
                  value={form.license_type}
                  onChange={(e) => setForm((f) => ({ ...f, license_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">—</option>
                  <option value="general">General</option>
                  <option value="simple">Simple</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="add-active"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="add-active" className="text-sm font-medium text-gray-700">Active</label>
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(""); }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {addSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="font-medium text-green-800">Company added.</p>
            <p className="text-sm text-green-700 mt-1">
              Share with the company: Company ID: <strong>{addSuccess.companyId}</strong>, Customer ID: <strong>{addSuccess.customerId}</strong>
              {addSuccess.contactPhone ? `, Phone: ${addSuccess.contactPhone}` : ""}.
            </p>
            <button
              type="button"
              onClick={() => setAddSuccess(null)}
              className="mt-2 text-sm text-green-600 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : stores.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No companies onboarded yet.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Company ID</th>
                  <th className="px-4 py-3 text-left">Company</th>
                  <th className="px-4 py-3 text-left">Customer ID</th>
                  <th className="px-4 py-3 text-left">Contact phone</th>
                  <th className="px-4 py-3 text-left">Joining date</th>
                  <th className="px-4 py-3 text-left">Address</th>
                  <th className="px-4 py-3 text-left">Location</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">License type</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stores.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{s.customer_code ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{s.contact_phone ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(s.join_date)}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate" title={s.address || ""}>{s.address || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{s.location || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${s.is_active !== false ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}>
                        {s.is_active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.license_type || "—"}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button type="button" onClick={() => openEdit(s)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                      <button type="button" onClick={() => setStoreToDelete(s)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
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
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Edit company</h2>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  {editError && <p className="text-red-600 text-sm">{editError}</p>}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company name *</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  {editing != null && (() => {
                    const store = stores.find((s) => s.id === editing);
                    return store ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
                        <input
                          type="text"
                          value={store.customer_code ?? "—"}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50"
                        />
                      </div>
                    ) : null;
                  })()}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact phone</label>
                    <input
                      type="text"
                      value={editForm.contact_phone}
                      onChange={(e) => setEditForm((f) => ({ ...f, contact_phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Company phone for registration"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Joining date</label>
                    <input
                      type="date"
                      value={editForm.join_date}
                      onChange={(e) => setEditForm((f) => ({ ...f, join_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License type</label>
                    <select
                      value={editForm.license_type}
                      onChange={(e) => setEditForm((f) => ({ ...f, license_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">—</option>
                      <option value="general">General</option>
                      <option value="simple">Simple</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit-active"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="edit-active" className="text-sm font-medium text-gray-700">Active</label>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
                    <button type="button" onClick={() => { setEditing(null); setEditError(""); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={!!storeToDelete}
          title="Delete company"
          content={storeToDelete ? `Permanently remove "${storeToDelete.name}" from onboarded list? This cannot be undone.` : ""}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteStore}
          onCancel={() => setStoreToDelete(null)}
        />
      </div>
    </div>
  );
}
