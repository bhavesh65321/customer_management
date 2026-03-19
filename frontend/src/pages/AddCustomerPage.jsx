import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ShopLayout from "../components/layout/ShopLayout";
import AddCustomerDrawer from "../components/ui/AddCustomer";
import { useLanguage } from "../context/LanguageContext";
import { API_BASE, authHeaders } from "../api";

export default function AddCustomerPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [error, setError] = useState("");

  const handleAdd = async (customerData) => {
    setError("");
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
    try {
      const res = await fetch(`${API_BASE}/api/customer/add`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (res.ok) {
        navigate("/customerDashboard");
        return;
      }
      const d = await res.json().catch(() => ({}));
      const msg = `${res.status}: ${d.detail || "Failed to add customer"}`;
      setError(msg);
      throw new Error(msg);
    } catch (err) {
      if (err.message) setError(err.message);
      throw err;
    }
  };

  return (
    <ShopLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t("customer.addCustomer")}</h1>
        <AddCustomerDrawer
          isOpen={true}
          onClose={() => navigate("/customerDashboard")}
          onAdd={handleAdd}
          error={error}
          onClearError={() => setError("")}
        />
      </div>
    </ShopLayout>
  );
}
