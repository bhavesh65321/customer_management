import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ShopLayout from "../components/layout/ShopLayout";
import { SHOP_MENU } from "../constants/shopMenu";
import { API_BASE, authHeaders, getToken, parseJwt } from "../api";

function formatDate(val) {
  if (!val) return null;
  const d = typeof val === "string" ? val.split("T")[0] : val;
  return d || null;
}

export default function Home() {
  const [company, setCompany] = useState(null);

  useEffect(() => {
    const token = getToken();
    const payload = token ? parseJwt(token) : null;
    const storeId = payload?.store_id;
    if (!storeId) return;
    fetch(`${API_BASE}/api/stores/me`, { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setCompany(data))
      .catch(() => setCompany(null));
  }, []);

  return (
    <ShopLayout>
      {company && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Your company</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Name</span>
              <p className="font-medium text-gray-900">{company.name}</p>
            </div>
            {company.customer_code && (
              <div>
                <span className="text-gray-500">Customer ID</span>
                <p className="font-medium text-gray-900">{company.customer_code}</p>
              </div>
            )}
            {company.location && (
              <div>
                <span className="text-gray-500">Location</span>
                <p className="font-medium text-gray-900">{company.location}</p>
              </div>
            )}
            {company.license_type && (
              <div>
                <span className="text-gray-500">License</span>
                <p className="font-medium text-gray-900 capitalize">{company.license_type}</p>
              </div>
            )}
            {formatDate(company.join_date) && (
              <div>
                <span className="text-gray-500">Joining date</span>
                <p className="font-medium text-gray-900">{formatDate(company.join_date)}</p>
              </div>
            )}
            {company.address && (
              <div className="sm:col-span-2">
                <span className="text-gray-500">Address</span>
                <p className="font-medium text-gray-900">{company.address}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6">Welcome back!</h1>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {SHOP_MENU.map((item) => (
          <Link
            key={item.name}
            to={item.to}
            className="bg-white rounded-lg shadow p-6 flex flex-col items-center hover:shadow-md transition"
          >
            <item.icon className="h-10 w-10 text-blue-600 mb-4" />
            <span className="text-lg font-medium">{item.name}</span>
          </Link>
        ))}
      </div>
    </ShopLayout>
  );
}
