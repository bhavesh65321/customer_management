import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/ui/BackButton";
import { Spinner } from "../components/ui/Spinner";
import ConfirmDialog from "../components/ui/ConfirmationPop";
import { API_BASE, authHeaders, authHeadersMultipart, getToken, parseJwt } from "../api";

// ─── helpers ────────────────────────────────────────────────────────────────

function storeLogoSrc(logoUrl) {
  if (!logoUrl) return null;
  return logoUrl.startsWith("http") ? logoUrl : `${API_BASE}${logoUrl}`;
}

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function isoDate(d) {
  if (!d) return "";
  return d.split("T")[0];
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

async function postStoreLogo(storeId, file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/admin/stores/${storeId}/logo`, {
    method: "POST", headers: authHeadersMultipart(), body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Logo upload failed");
  return data;
}

const LICENSE_TYPES = ["general", "simple", "premium"];

const LICENSE_COLORS = {
  general:  "bg-blue-100 text-blue-700",
  simple:   "bg-purple-100 text-purple-700",
  premium:  "bg-amber-100 text-amber-800",
};

const EMPTY_FORM = {
  name: "", join_date: "", license_expiry: "", address: "",
  location: "", contact_phone: "", is_active: true, license_type: "",
  owner_name: "", owner_email: "",
};

// ─── KPI card ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = "text-gray-800", icon }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 flex items-start gap-3">
      <div className={`text-xl sm:text-2xl shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">{label}</p>
        <p className={`text-xl sm:text-3xl font-bold mt-0.5 ${color} break-words`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1 leading-snug">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Onboarding wizard ──────────────────────────────────────────────────────

function OnboardWizard({ onDone, onCancel }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [manager, setManager] = useState({ enabled: false, name: "", email: "", password: "", role: "manager", designation: "", phone: "" });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setM = (k, v) => setManager(m => ({ ...m, [k]: v }));

  const handleSubmit = async () => {
    setError(""); setSaving(true);
    try {
      const payload = {
        store: {
          name: form.name.trim(),
          join_date: form.join_date || null,
          license_expiry: form.license_expiry || null,
          license_type: form.license_type || null,
          address: form.address.trim() || null,
          location: form.location.trim() || null,
          contact_phone: form.contact_phone.trim() || null,
          is_active: form.is_active,
          owner_name: form.owner_name.trim() || null,
          owner_email: form.owner_email.trim() || null,
        },
        manager: manager.enabled ? {
          name: manager.name.trim(),
          email: manager.email.trim(),
          password: manager.password,
          role: manager.role,
          designation: manager.designation.trim() || null,
          phone: manager.phone.trim() || null,
        } : null,
      };
      const res = await fetch(`${API_BASE}/api/admin/stores/onboard`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data?.error?.message || "Onboarding failed");
      if (logoFile && data.store?.id) {
        try { await postStoreLogo(data.store.id, logoFile); } catch { /* non-fatal */ }
      }
      onDone(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
        {/* header + steps */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Onboard New Company</h2>
          <div className="flex items-center gap-2 mt-4">
            {["Company Info", "License & Dates", "Manager Account"].map((label, i) => (
              <React.Fragment key={i}>
                <button
                  type="button"
                  onClick={() => i + 1 < step && setStep(i + 1)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors
                    ${step === i + 1 ? "bg-blue-600 text-white" : step > i + 1 ? "bg-green-100 text-green-700 cursor-pointer hover:bg-green-200" : "bg-gray-100 text-gray-400 cursor-default"}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
                    ${step === i + 1 ? "bg-white/30" : step > i + 1 ? "bg-green-500 text-white" : "bg-gray-300"}`}>
                    {step > i + 1 ? "✓" : i + 1}
                  </span>
                  {label}
                </button>
                {i < 2 && <div className={`flex-1 h-0.5 ${step > i + 1 ? "bg-green-400" : "bg-gray-200"}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          {/* Step 1 */}
          {step === 1 && (
            <>
              <div>
                <label className={labelCls}>Company name *</label>
                <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. KC Jewellers" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Owner name</label>
                  <input className={inputCls} value={form.owner_name} onChange={e => set("owner_name", e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label className={labelCls}>Owner email</label>
                  <input className={inputCls} type="email" value={form.owner_email} onChange={e => set("owner_email", e.target.value)} placeholder="owner@shop.com" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Address</label>
                <input className={inputCls} value={form.address} onChange={e => set("address", e.target.value)} placeholder="Street address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>City / Location</label>
                  <input className={inputCls} value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Pune" />
                </div>
                <div>
                  <label className={labelCls}>Contact phone</label>
                  <input className={inputCls} value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} placeholder="10-digit number" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Company logo <span className="text-gray-400 font-normal">(optional)</span></label>
                <div className="flex items-center gap-4">
                  {logoPreview && <img src={logoPreview} alt="" className="h-14 w-14 object-contain rounded-lg border border-gray-200 bg-gray-50" />}
                  <label className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        setLogoFile(f || null);
                        setLogoPreview(prev => { if (prev) URL.revokeObjectURL(prev); return f ? URL.createObjectURL(f) : null; });
                      }} />
                    {logoFile ? "Change image" : "Upload logo"}
                  </label>
                  {logoFile && (
                    <button type="button" className="text-sm text-gray-400 hover:text-red-500"
                      onClick={() => { setLogoFile(null); setLogoPreview(prev => { if (prev) URL.revokeObjectURL(prev); return null; }); }}>
                      ✕ Clear
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP or GIF, max 2 MB.</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="wiz-active" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} className="rounded border-gray-300 w-4 h-4" />
                <label htmlFor="wiz-active" className="text-sm font-medium text-gray-700">Active (staff can log in immediately)</label>
              </div>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <div>
                <label className={labelCls}>License type</label>
                <div className="grid grid-cols-3 gap-3 mt-1">
                  {LICENSE_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => set("license_type", t)}
                      className={`py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all
                        ${form.license_type === t ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-blue-300"}`}>
                      {t === "general" && "📋 "}{t === "simple" && "⚡ "}{t === "premium" && "⭐ "}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
                {form.license_type && (
                  <button type="button" onClick={() => set("license_type", "")} className="text-xs text-gray-400 hover:text-red-500 mt-2">✕ Clear</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Joining date</label>
                  <input type="date" className={inputCls} value={form.join_date} onChange={e => set("join_date", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>License expiry date</label>
                  <input type="date" className={inputCls} value={form.license_expiry} onChange={e => set("license_expiry", e.target.value)} />
                </div>
              </div>
              {form.license_expiry && (() => {
                const days = daysUntil(form.license_expiry);
                return (
                  <div className={`p-3 rounded-lg text-sm font-medium ${days < 0 ? "bg-red-50 text-red-600" : days <= 30 ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                    {days < 0 ? `⚠️ This date is in the past (${Math.abs(days)} days ago)` : days === 0 ? "⚠️ Expires today" : `✓ Expires in ${days} days`}
                  </div>
                );
              })()}
            </>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Create manager account</p>
                  <p className="text-xs text-gray-500 mt-0.5">Give the shop owner immediate login access</p>
                </div>
                <button type="button" onClick={() => setM("enabled", !manager.enabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${manager.enabled ? "bg-blue-600" : "bg-gray-300"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${manager.enabled ? "translate-x-5" : ""}`} />
                </button>
              </div>
              {manager.enabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Full name *</label>
                      <input className={inputCls} value={manager.name} onChange={e => setM("name", e.target.value)} placeholder="Manager name" />
                    </div>
                    <div>
                      <label className={labelCls}>Role</label>
                      <select className={inputCls} value={manager.role} onChange={e => setM("role", e.target.value)}>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Email *</label>
                    <input className={inputCls} type="email" value={manager.email} onChange={e => setM("email", e.target.value)} placeholder="manager@shop.com" />
                  </div>
                  <div>
                    <label className={labelCls}>Password *</label>
                    <input className={inputCls} type="password" value={manager.password} onChange={e => setM("password", e.target.value)} placeholder="Min 8 chars, letter + number" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Designation</label>
                      <input className={inputCls} value={manager.designation} onChange={e => setM("designation", e.target.value)} placeholder="e.g. Owner" />
                    </div>
                    <div>
                      <label className={labelCls}>Phone</label>
                      <input className={inputCls} value={manager.phone} onChange={e => setM("phone", e.target.value)} placeholder="Manager phone" />
                    </div>
                  </div>
                </div>
              )}
              {!manager.enabled && (
                <p className="text-sm text-gray-500 bg-blue-50 rounded-lg p-3">
                  💡 You can add users later via <strong>Manage Users</strong>, or share the Company ID so the owner can self-register.
                </p>
              )}
            </>
          )}
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
          <button type="button" onClick={step === 1 ? onCancel : () => setStep(s => s - 1)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            {step === 1 ? "Cancel" : "← Back"}
          </button>
          {step < 3 ? (
            <button type="button"
              onClick={() => { if (step === 1 && !form.name.trim()) { setError("Company name is required"); return; } setError(""); setStep(s => s + 1); }}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
              Next →
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={saving}
              className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60">
              {saving ? "Saving…" : "✓ Complete Onboarding"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Edit modal ─────────────────────────────────────────────────────────────

function EditModal({ store, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: store.name ?? "",
    join_date: isoDate(store.join_date),
    license_expiry: isoDate(store.license_expiry),
    address: store.address ?? "",
    location: store.location ?? "",
    contact_phone: store.contact_phone ?? "",
    is_active: store.is_active !== false,
    license_type: store.license_type ?? "",
    owner_name: store.owner_name ?? "",
    owner_email: store.owner_email ?? "",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  const handleSave = async () => {
    setError(""); setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        join_date: form.join_date || null,
        license_expiry: form.license_expiry || null,
        address: form.address.trim() || null,
        location: form.location.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        is_active: form.is_active,
        license_type: form.license_type || null,
        owner_name: form.owner_name.trim() || null,
        owner_email: form.owner_email.trim() || null,
      };
      const res = await fetch(`${API_BASE}/api/admin/stores/${store.id}`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data?.error?.message || "Failed to update");
      if (logoFile) {
        try { await postStoreLogo(store.id, logoFile); } catch (e) { setError(e.message); }
      }
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Edit — {store.name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Company ID: <strong>{store.company_id ?? "—"}</strong></p>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <div>
            <label className={labelCls}>Company name *</label>
            <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Owner name</label>
              <input className={inputCls} value={form.owner_name} onChange={e => set("owner_name", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Owner email</label>
              <input className={inputCls} type="email" value={form.owner_email} onChange={e => set("owner_email", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Contact phone</label>
            <input className={inputCls} value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>License type</label>
            <select className={inputCls} value={form.license_type} onChange={e => set("license_type", e.target.value)}>
              <option value="">— None —</option>
              {LICENSE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Joining date</label>
              <input type="date" className={inputCls} value={form.join_date} onChange={e => set("join_date", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>License expiry</label>
              <input type="date" className={inputCls} value={form.license_expiry} onChange={e => set("license_expiry", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <input className={inputCls} value={form.address} onChange={e => set("address", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>City / Location</label>
            <input className={inputCls} value={form.location} onChange={e => set("location", e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="edit-active" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} className="rounded border-gray-300 w-4 h-4" />
            <label htmlFor="edit-active" className="text-sm font-medium text-gray-700">Active</label>
          </div>
          <div>
            <label className={labelCls}>Company logo</label>
            <div className="flex items-center gap-4">
              {(logoPreview || store.logo_url) && (
                <img src={logoPreview || storeLogoSrc(store.logo_url)} alt="" className="h-14 w-14 object-contain rounded-lg border border-gray-200 bg-gray-50" />
              )}
              <label className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    setLogoFile(f || null);
                    setLogoPreview(prev => { if (prev) URL.revokeObjectURL(prev); return f ? URL.createObjectURL(f) : null; });
                  }} />
                {logoFile ? "Change image" : "Upload / replace logo"}
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP or GIF, max 2 MB.</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Expiry badge ─────────────────────────────────────────────────────────────

function ExpiryBadge({ dateStr }) {
  if (!dateStr) return <span className="text-gray-400 text-xs">—</span>;
  const days = daysUntil(dateStr);
  if (days < 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">⚠ Expired</span>
  );
  if (days <= 30) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">⏰ {days}d left</span>
  );
  return <span className="text-xs text-gray-600">{fmtDate(dateStr)}</span>;
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [stores, setStores] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editStore, setEditStore] = useState(null);
  const [storeToDelete, setStoreToDelete] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLicense, setFilterLicense] = useState("all");

  useEffect(() => {
    const token = getToken();
    const payload = token ? parseJwt(token) : null;
    setAuthChecked(true);
    // Only superadmin (platform owner) can access this page.
    // Store admins (role="admin") are redirected to their own dashboard.
    if (!token || payload?.role !== "superadmin") navigate("/home", { replace: true });
  }, [navigate]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [storesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stores`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/admin/stats`, { headers: authHeaders() }),
      ]);
      if (storesRes.status === 401) { navigate("/login"); return; }
      const storesData = await storesRes.json().catch(() => []);
      const statsData = statsRes.ok ? await statsRes.json().catch(() => null) : null;
      setStores(Array.isArray(storesData) ? storesData : []);
      setStats(statsData);
    } catch {
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { if (authChecked) fetchAll(); }, [authChecked, fetchAll]);

  const handleDeleteStore = async () => {
    if (!storeToDelete) return;
    try {
      await fetch(`${API_BASE}/api/admin/stores/${storeToDelete.id}`, { method: "DELETE", headers: authHeaders() });
    } finally {
      setStoreToDelete(null);
      fetchAll();
    }
  };

  const filtered = stores.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name?.toLowerCase().includes(q) || s.contact_phone?.includes(q) || s.company_id?.toLowerCase().includes(q) || s.location?.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || (filterStatus === "active" ? s.is_active !== false : s.is_active === false);
    const matchLicense = filterLicense === "all" || (s.license_type ?? "") === filterLicense;
    return matchSearch && matchStatus && matchLicense;
  });

  if (!authChecked) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Spinner size="lg" center />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* header */}
        <div><BackButton to="/home" label="Go to My Shop" /></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Console</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage onboarded jewellery companies.</p>
          </div>
          <button onClick={() => setShowWizard(true)}
            className="self-start sm:self-auto flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm whitespace-nowrap">
            + Onboard Company
          </button>
        </div>

        {/* success banner */}
        {successBanner && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="font-semibold text-green-800">✓ {successBanner.message || "Company onboarded successfully!"}</p>
            {successBanner.store?.company_id && (
              <p className="text-sm text-green-700 mt-1">
                Company ID: <strong className="font-mono">{successBanner.store.company_id}</strong>
                {successBanner.manager_created && <> · Manager account created</>}
              </p>
            )}
            <button onClick={() => setSuccessBanner(null)} className="mt-2 text-xs text-green-600 hover:underline">Dismiss</button>
          </div>
        )}

        {/* KPI cards — 2×2 on tablet, 4-in-a-row on xl */}
        {!loading && stats && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard icon="🏢" label="Total Companies" value={stats.total}
              sub={`${stats.active} active · ${stats.inactive} inactive`} />
            <KpiCard icon="✅" label="Active" value={stats.active} color="text-green-600"
              sub={stats.total ? `${Math.round((stats.active / stats.total) * 100)}% of total` : "—"} />
            <KpiCard icon="⏰" label="Expiring ≤ 30d" value={stats.expiring_soon}
              color={stats.expiring_soon > 0 ? "text-amber-600" : "text-gray-800"}
              sub={stats.expired > 0 ? `${stats.expired} already expired` : "All current"} />
            <KpiCard icon="💰" label="Total Revenue"
              value={"₹" + Number(stats.total_revenue || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              color="text-green-700"
              sub={`across ${stats.total} companies`} />
          </div>
        )}

        {/* Plan chips */}
        {!loading && stats && Object.keys(stats.by_license_type || {}).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.by_license_type).map(([k, v]) => (
              <span key={k} className={`px-3 py-1 rounded-full text-xs font-semibold border
                ${k === "premium" ? "bg-amber-50 border-amber-200 text-amber-800" :
                  k === "simple"  ? "bg-purple-50 border-purple-200 text-purple-700" :
                  k === "general" ? "bg-blue-50 border-blue-200 text-blue-700" :
                  "bg-gray-50 border-gray-200 text-gray-600"}`}>
                {k.charAt(0).toUpperCase() + k.slice(1)}: {v}
              </span>
            ))}
          </div>
        )}

        {/* Filters — search on top, two labelled pill rows below */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, code, city…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium shrink-0 w-12">Status:</span>
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {["all", "active", "inactive"].map(v => (
                <button key={v} onClick={() => setFilterStatus(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors
                    ${filterStatus === v ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium shrink-0 w-12">Plan:</span>
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              <button onClick={() => setFilterLicense("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors
                  ${filterLicense === "all" ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                All plans
              </button>
              {LICENSE_TYPES.map(t => (
                <button key={t} onClick={() => setFilterLicense(filterLicense === t ? "all" : t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors
                    ${filterLicense === t ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table — fixed min-width so columns never squash; parent clips + scrolls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <Spinner size="lg" center />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-medium">{stores.length === 0 ? "No companies onboarded yet." : "No companies match your filters."}</p>
                {stores.length === 0 && (
                  <button onClick={() => setShowWizard(true)} className="mt-3 text-sm text-blue-600 hover:underline">Onboard your first company →</button>
                )}
              </div>
            ) : (
              <table className="divide-y divide-gray-100 text-sm" style={{ minWidth: "860px", width: "100%" }}>
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left" style={{ width: "240px" }}>Company</th>
                    <th className="px-4 py-3 text-left" style={{ width: "140px" }}>Company ID</th>
                    <th className="px-4 py-3 text-left" style={{ width: "120px" }}>Contact</th>
                    <th className="px-4 py-3 text-left" style={{ width: "90px" }}>Plan</th>
                    <th className="px-4 py-3 text-right" style={{ width: "110px" }}>Revenue</th>
                    <th className="px-4 py-3 text-left" style={{ width: "120px" }}>Expiry</th>
                    <th className="px-4 py-3 text-left" style={{ width: "80px" }}>Status</th>
                    <th className="px-4 py-3 text-right" style={{ width: "150px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(s => {
                    const days = daysUntil(s.license_expiry);
                    const rowWarn = s.license_expiry && days !== null && days <= 30;
                    return (
                      <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${rowWarn ? "bg-amber-50/40" : ""}`}>
                        {/* Company */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {s.logo_url
                              ? <img src={storeLogoSrc(s.logo_url)} alt="" className="h-9 w-9 object-contain rounded-lg border border-gray-100 bg-gray-50 shrink-0" />
                              : <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">{(s.name || "?")[0].toUpperCase()}</div>
                            }
                            <div className="min-w-0">
                              <button onClick={() => navigate(`/admin/stores/${s.id}`)}
                                className="font-semibold text-blue-700 hover:text-blue-900 hover:underline leading-tight text-left block max-w-[150px] truncate">
                                {s.name}
                              </button>
                              {(s.owner_name || s.location) && (
                                <p className="text-xs text-gray-400 mt-0.5 max-w-[150px] truncate">
                                  {[s.owner_name, s.location].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Company ID */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{s.company_id ?? "—"}</span>
                        </td>
                        {/* Contact */}
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{s.contact_phone ?? "—"}</td>
                        {/* Plan */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {s.license_type
                            ? <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${LICENSE_COLORS[s.license_type] || "bg-gray-100 text-gray-600"}`}>{s.license_type}</span>
                            : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        {/* Revenue */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="text-sm font-semibold text-green-700">
                            ₹{Number(s.revenue || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </span>
                        </td>
                        {/* Expiry */}
                        <td className="px-4 py-3 whitespace-nowrap"><ExpiryBadge dateStr={s.license_expiry} /></td>
                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${s.is_active !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {s.is_active !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => navigate(`/admin/stores/${s.id}`)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                              View
                            </button>
                            <button onClick={() => setEditStore(s)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                              Edit
                            </button>
                            <button onClick={() => setStoreToDelete(s)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {!loading && filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-gray-400">Showing {filtered.length} of {stores.length} companies</span>
              <span className="text-xs font-semibold text-gray-600">
                Revenue shown: <span className="text-green-700">
                  ₹{filtered.reduce((sum, s) => sum + (s.revenue || 0), 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* modals */}
      {showWizard && (
        <OnboardWizard
          onDone={data => { setShowWizard(false); setSuccessBanner(data); fetchAll(); }}
          onCancel={() => setShowWizard(false)}
        />
      )}
      {editStore && (
        <EditModal
          store={editStore}
          onSave={() => { setEditStore(null); fetchAll(); }}
          onCancel={() => setEditStore(null)}
        />
      )}
      <ConfirmDialog
        open={!!storeToDelete}
        title="Delete company"
        content={storeToDelete ? `Permanently remove "${storeToDelete.name}"? This cannot be undone.` : ""}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteStore}
        onCancel={() => setStoreToDelete(null)}
      />
    </div>
  );
}
