import React, { useState, useEffect, useCallback } from "react";
import InlineError from "./InlineError";
import Modal from "./Modal";
import { useLanguage } from "../../context/LanguageContext";
import { authHeaders, API_BASE } from "../../api";

function digitsOnly(s) {
  return String(s || "").replace(/\D/g, "");
}
const EMPTY_FORM = {
  name: "",
  fatherName: "",
  phonePrimary: "",
  phoneSecondary: "",
  email: "",
  address: "",
  city: "",
  pincode: "",
  gender: "Male",
  country: "India",
};

export default function AddCustomerDrawer({
  isOpen,
  onClose,
  onAdd,
  initialData,
  error,
  onClearError,
}) {
  const { t } = useLanguage();
  const [fieldErrors, setFieldErrors] = useState({});
  const [showExtra, setShowExtra] = useState(false);
  const [phoneWarning, setPhoneWarning] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        name: initialData.name || "",
        fatherName: initialData.father_name || "",
        phonePrimary: initialData.primary_phone || "",
        phoneSecondary: initialData.secondary_phone || "",
        email: initialData.email || "",
        address: initialData.address || "",
        city: initialData.city || "",
        pincode: initialData.pincode || "",
        gender: initialData.gender || "Male",
        country: initialData.country || "India",
      });
      setShowExtra(true);
    } else if (!isOpen) {
      setFormData(EMPTY_FORM);
      setShowExtra(false);
      setPhoneWarning(null);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (isOpen) setFieldErrors({});
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    if (onClearError) onClearError();
  };

  const checkDuplicatePhone = useCallback(async (phone) => {
    const digits = digitsOnly(phone);
    if (digits.length < 10) { setPhoneWarning(null); return; }
    if (initialData?.primary_phone && digitsOnly(initialData.primary_phone) === digits) {
      setPhoneWarning(null); return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/customers?search=${encodeURIComponent(phone)}&limit=5`,
        { headers: authHeaders() }
      );
      if (!res.ok) return;
      const data = await res.json();
      const customers = data.customers ?? data ?? [];
      const match = customers.find((c) => digitsOnly(c.primary_phone) === digits);
      if (match) setPhoneWarning({ name: match.name, id: match.id });
      else setPhoneWarning(null);
    } catch { setPhoneWarning(null); }
  }, [initialData]);

  const handleSubmit = async () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = t("customer.validationNameRequired");
    if (digitsOnly(formData.phonePrimary).length < 5) errs.phonePrimary = t("customer.validationPhoneInvalid");
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    const result = onAdd(formData);
    if (result && typeof result.then === "function") {
      try { await result; } catch { /* parent sets error */ }
    }
  };

  const inputCls = (field) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition-colors ${
      fieldErrors[field] ? "border-red-400 bg-red-50" : "border-gray-200"
    }`;
  const labelCls = "block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5";

  return (
    <Modal
      show={isOpen}
      onClose={onClose}
      title={initialData ? t("customer.editCustomer") : t("customer.addNew")}
      maxWidth="max-w-lg"
    >
      {error && (() => {
        const isDuplicatePhone = /phone.*already exists|already exists.*phone/i.test(error);
        return isDuplicatePhone ? (
          <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">Phone already registered</p>
              <p className="text-xs text-amber-600 mt-0.5">
                A customer with this number exists. Try a different number or search for them.
              </p>
            </div>
            <button type="button" onClick={onClearError} className="text-amber-400 hover:text-amber-600 shrink-0">✕</button>
          </div>
        ) : (
          <div className="mb-4">
            <InlineError message={error} onDismiss={onClearError} />
          </div>
        );
      })()}

      <div className="space-y-4">

        {/* ── Required fields ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>
              {t("form.name")} <span className="text-red-400">*</span>
            </label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={inputCls("name")}
              placeholder={t("form.enterName")}
              autoComplete="name"
              autoFocus
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label className={labelCls}>
              {t("form.primaryPhone")} <span className="text-red-400">*</span>
            </label>
            <input
              name="phonePrimary"
              value={formData.phonePrimary}
              onChange={handleChange}
              onBlur={(e) => checkDuplicatePhone(e.target.value)}
              className={inputCls("phonePrimary")}
              placeholder="e.g. 9876543210"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
            />
            {fieldErrors.phonePrimary && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.phonePrimary}</p>
            )}
            {phoneWarning && !fieldErrors.phonePrimary && (
              <p className="mt-1 text-xs text-amber-600">
                ⚠️ Already used by{" "}
                <button
                  type="button"
                  className="underline font-semibold"
                  onClick={() => { onClose(); window.location.href = `/customer/${phoneWarning.id}`; }}
                >
                  {phoneWarning.name}
                </button>
              </p>
            )}
          </div>

          <div>
            <label className={labelCls}>{t("form.fatherName")}</label>
            <input
              name="fatherName"
              value={formData.fatherName}
              onChange={handleChange}
              className={inputCls("fatherName")}
              placeholder={t("form.enterFatherName")}
            />
          </div>
        </div>

        {/* ── Additional details toggle ─────────────────────────────── */}
        <button
          type="button"
          onClick={() => setShowExtra((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 py-1"
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform ${showExtra ? "rotate-90" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {showExtra ? "Hide" : "Add"} additional details
          {!showExtra && <span className="font-normal text-gray-400">(phone 2, email, address…)</span>}
        </button>

        {/* ── Collapsible extra fields ──────────────────────────────── */}
        {showExtra && (
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t("form.secondaryPhone")}</label>
                <input
                  name="phoneSecondary"
                  value={formData.phoneSecondary}
                  onChange={handleChange}
                  className={inputCls("phoneSecondary")}
                  placeholder={t("form.enterAlternatePhone")}
                  type="tel"
                />
              </div>
              <div>
                <label className={labelCls}>{t("form.email")}</label>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputCls("email")}
                  placeholder={t("form.enterEmail")}
                  type="email"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>{t("form.gender")}</label>
              <div className="flex gap-2">
                {["Male", "Female", "Other"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, gender: g }))}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-colors ${
                      formData.gender === g
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-200 text-gray-500 hover:border-blue-200 hover:text-blue-600"
                    }`}
                  >
                    {g === "Male" ? "♂ Male" : g === "Female" ? "♀ Female" : "⊕ Other"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>{t("form.fullAddress")}</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={`${inputCls("address")} resize-none h-16`}
                placeholder={t("form.enterAddress")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t("form.city")}</label>
                <input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className={inputCls("city")}
                  placeholder={t("form.enterCity")}
                />
              </div>
              <div>
                <label className={labelCls}>{t("form.pincode")}</label>
                <input
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className={inputCls("pincode")}
                  placeholder={t("form.enterPincode")}
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="pt-5 mt-5 border-t border-gray-100 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400">
          <span className="text-red-400">*</span> Required fields
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
          >
            {initialData ? t("customer.updateCustomer") : t("customer.addCustomer")} →
          </button>
        </div>
      </div>
    </Modal>
  );
}
