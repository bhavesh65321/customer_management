import React from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { getToken, parseJwt } from "../../api";

export default function CustomerPortalLayout() {
  const navigate = useNavigate();
  const token = getToken();
  const payload = token ? parseJwt(token) : null;
  const isCustomer = payload?.role === "customer";

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/customer/login");
  };

  if (!token || !isCustomer) {
    navigate("/customer/login", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <nav className="flex gap-4" aria-label="Main">
            <NavLink
              to="/customer/dashboard"
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? "text-blue-600" : "text-gray-600 hover:text-gray-900"}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/customer/profile"
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? "text-blue-600" : "text-gray-600 hover:text-gray-900"}`
              }
            >
              Profile
            </NavLink>
            <NavLink
              to="/customer/invoices"
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? "text-blue-600" : "text-gray-600 hover:text-gray-900"}`
              }
            >
              Invoices
            </NavLink>
            <NavLink
              to="/customer/orders"
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? "text-blue-600" : "text-gray-600 hover:text-gray-900"}`
              }
            >
              My purchases
            </NavLink>
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
