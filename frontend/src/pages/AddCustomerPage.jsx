import React from "react";
import { useNavigate } from "react-router-dom";
import ShopLayout from "../components/layout/ShopLayout";
import AddCustomerDrawer from "../components/ui/AddCustomer";
import { API_BASE, authHeaders } from "../api";

export default function AddCustomerPage() {
  const navigate = useNavigate();

  const handleAdd = async (customerData) => {
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
      return;
    }
    if (res.ok) {
      navigate("/customerDashboard");
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.detail || "Failed to add customer");
      throw new Error(d.detail || "Failed");
    }
  };

  return (
    <ShopLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Add Customer</h1>
        <AddCustomerDrawer
          isOpen={true}
          onClose={() => navigate("/customerDashboard")}
          onAdd={handleAdd}
        />
      </div>
    </ShopLayout>
  );
}
