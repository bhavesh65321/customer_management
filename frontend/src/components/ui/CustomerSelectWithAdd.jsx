import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AddCustomerDrawer from "./AddCustomer";
import { API_BASE, authHeaders } from "../../api";
import { useLanguage } from "../../context/LanguageContext";

export default function CustomerSelectWithAdd({
  value,
  onChange,
  required = false,
  id = "customer-select",
  label,
  disabled = false,
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchCustomers = useCallback(() => {
    fetch(`${API_BASE}/api/customer/all`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setCustomers(Array.isArray(d) ? d : []))
      .catch(() => setCustomers([]));
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleAddCustomer = async (customerData) => {
    setFormError("");
    const payload = {
      name: customerData.name,
      father_name: customerData.fatherName,
      primary_phone: customerData.phonePrimary,
      secondary_phone: customerData.phoneSecondary || null,
      address: customerData.address || null,
      city: customerData.city || null,
      pincode: customerData.pincode || null,
      gender: customerData.gender,
      country: customerData.country,
      email: customerData.email || null,
    };
    const res = await fetch(`${API_BASE}/api/customer/add`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (res.status === 401) {
      navigate("/login");
      throw new Error("Unauthorized");
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      const msg = d.detail || "Failed to add customer";
      setFormError(typeof msg === "string" ? msg : JSON.stringify(msg));
      throw new Error(msg);
    }
    const created = await res.json();
    await fetchCustomers();
    if (created?.id != null) {
      onChange(String(created.id));
    }
  };

  const displayLabel =
    label ??
    `${t("customer.customerLabel")}${required ? " *" : ""}`;

  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
        {displayLabel}
      </label>
      <div className="flex flex-wrap items-stretch gap-2">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          className="flex-1 min-w-[200px] px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
        >
          <option value="">{t("common.selectCustomer")}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.primary_phone ? ` · ${c.primary_phone}` : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="px-4 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors whitespace-nowrap"
        >
          + {t("customer.addCustomer")}
        </button>
      </div>
      <AddCustomerDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAdd={handleAddCustomer}
        error={formError}
        onClearError={() => setFormError("")}
      />
    </div>
  );
}
