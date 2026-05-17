import React, { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import CustomerSelectWithAdd from "../../components/ui/CustomerSelectWithAdd";
import { API_BASE, authHeaders, authHeadersMultipart } from "../../api";
import { parseApiError } from "../../utils/apiError";

const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition-colors";
const labelCls = "block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5";
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function GirviNewPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState(null);   // File object
  const [photoPreview, setPhotoPreview] = useState(null); // Object URL for preview
  const [photoDragOver, setPhotoDragOver] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    jewelry_description: "",
    gross_weight: "",
    purity: "",
    principal_amount: "",
    interest_rate_per_month: "",
    start_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Live interest preview
  const preview = useMemo(() => {
    const principal = parseFloat(form.principal_amount) || 0;
    const rate      = parseFloat(form.interest_rate_per_month) || 0;
    const start     = form.start_date ? new Date(form.start_date) : new Date();
    const today     = new Date();
    const msElapsed = Math.max(0, today - start);
    const monthsElapsed = msElapsed / (1000 * 60 * 60 * 24 * 30.44);
    const monthlyInterest = principal * rate / 100;
    const accruedToday  = monthlyInterest * monthsElapsed;
    const totalDue      = principal + accruedToday;
    return { monthlyInterest, accruedToday, totalDue, monthsElapsed };
  }, [form.principal_amount, form.interest_rate_per_month, form.start_date]);

  const pickPhoto = (file) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { setError("Only JPEG, PNG or WebP images allowed."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Photo must be 5 MB or smaller."); return; }
    setError("");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const customer_id = parseInt(form.customer_id, 10);
    const principal   = parseFloat(form.principal_amount);
    const rate        = parseFloat(form.interest_rate_per_month);
    if (!customer_id || !form.jewelry_description || !principal || !rate || !form.start_date) {
      setError("Please fill Customer, Description, Principal, Interest % and Start date.");
      return;
    }
    setLoading(true);
    try {
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
          photo_urls: [],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(parseApiError(data, "Failed to create loan. Please try again."));
      }
      const loan = await res.json();

      // Stage 2 — upload photo if selected
      if (photoFile && loan.id) {
        const fd = new FormData();
        fd.append("file", photoFile);
        await fetch(`${API_BASE}/api/girvi/${loan.id}/photo`, {
          method: "POST",
          headers: authHeadersMultipart(),
          body: fd,
        });
      }

      navigate("/girvi");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasPreview = parseFloat(form.principal_amount) > 0 && parseFloat(form.interest_rate_per_month) > 0;

  return (
    <ShopLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Girvi / Loans</p>
          <h1 className="text-2xl font-extrabold text-gray-900">New Loan</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{error}</div>
          )}

          {/* Customer */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className={labelCls}>Customer <span className="text-red-400">*</span></p>
            <CustomerSelectWithAdd
              id="girvi-customer_id"
              value={form.customer_id}
              onChange={(v) => setForm((f) => ({ ...f, customer_id: v }))}
              required
              label=""
            />
          </div>

          {/* Jewellery details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Jewellery Details</p>

            <div>
              <label className={labelCls}>Description <span className="text-red-400">*</span></label>
              <textarea
                name="jewelry_description"
                value={form.jewelry_description}
                onChange={handleChange}
                rows={2}
                className={inputCls}
                placeholder="e.g. Gold chain, 22K, Mangalsutra…"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Gross Weight (g)</label>
                <input type="number" step="0.01" name="gross_weight" value={form.gross_weight}
                  onChange={handleChange} className={inputCls} placeholder="e.g. 12.50" />
              </div>
              <div>
                <label className={labelCls}>Purity (K)</label>
                <input type="number" step="0.01" name="purity" value={form.purity}
                  onChange={handleChange} className={inputCls} placeholder="e.g. 22" />
              </div>
            </div>

            {/* Photo upload */}
            <div>
              <label className={labelCls}>Photo <span className="text-gray-300 normal-case font-normal tracking-normal">optional · max 5 MB</span></label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => pickPhoto(e.target.files[0])}
              />
              {!photoPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setPhotoDragOver(true); }}
                  onDragLeave={() => setPhotoDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setPhotoDragOver(false); pickPhoto(e.dataTransfer.files[0]); }}
                  className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-7 cursor-pointer transition-colors ${photoDragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}
                >
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm text-gray-400 font-medium">Click or drag to upload photo</p>
                  <p className="text-xs text-gray-300">JPEG · PNG · WebP</p>
                </div>
              ) : (
                <div className="relative inline-block">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-xl border border-gray-200 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow hover:bg-red-600 transition-colors"
                    title="Remove photo"
                  >✕</button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 block text-xs text-blue-500 hover:underline"
                  >Change photo</button>
                </div>
              )}
            </div>
          </div>

          {/* Loan terms */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Loan Terms</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Loan Amount (₹) <span className="text-red-400">*</span></label>
                <input type="number" step="0.01" name="principal_amount" value={form.principal_amount}
                  onChange={handleChange} required className={inputCls} placeholder="e.g. 50000" />
              </div>
              <div>
                <label className={labelCls}>Interest % / Month <span className="text-red-400">*</span></label>
                <input type="number" step="0.01" name="interest_rate_per_month" value={form.interest_rate_per_month}
                  onChange={handleChange} required className={inputCls} placeholder="e.g. 1.5" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Start Date <span className="text-red-400">*</span></label>
              <input type="date" name="start_date" value={form.start_date}
                onChange={handleChange} required className={inputCls} />
            </div>

            {/* Live interest preview */}
            {hasPreview && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-3">Interest Preview</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-amber-600 font-medium mb-0.5">Monthly Interest</p>
                    <p className="text-base font-extrabold text-amber-800">₹{fmt(preview.monthlyInterest)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-amber-600 font-medium mb-0.5">Accrued Today</p>
                    <p className="text-base font-extrabold text-amber-800">₹{fmt(preview.accruedToday)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-amber-600 font-medium mb-0.5">Total Due Now</p>
                    <p className="text-base font-extrabold text-gray-900">₹{fmt(preview.totalDue)}</p>
                  </div>
                </div>
                <p className="text-[10px] text-amber-500 mt-2 text-center">
                  {preview.monthsElapsed < 0.03 ? "Loan starting today" : `Based on ${(preview.monthsElapsed).toFixed(1)} months elapsed`}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className={labelCls}>Notes</label>
            <input type="text" name="notes" value={form.notes}
              onChange={handleChange} className={inputCls} placeholder="Any additional notes (optional)" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors"
            >
              {loading ? "Saving…" : "Save Girvi"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/girvi")}
              className="px-5 py-3 border border-gray-200 rounded-xl text-gray-500 font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </ShopLayout>
  );
}
