import React, { useState } from "react";
import ShopLayout from "../components/layout/ShopLayout";

// ── Role permission matrix ──────────────────────────────────────────────────
// This is a read-only reference for staff to understand what each role can do.
// Backend enforces these — this page is purely informational / training aid.

const ROLES = ["admin", "manager", "staff", "customer"];

const PERMISSIONS = [
  // Category, Permission label, which roles have access
  {
    category: "Authentication",
    items: [
      { label: "Login / Logout",                 admin: true, manager: true, staff: true, customer: true },
      { label: "Reset own password",             admin: true, manager: true, staff: true, customer: true },
      { label: "View own profile",               admin: true, manager: true, staff: true, customer: true },
    ],
  },
  {
    category: "Customers",
    items: [
      { label: "View customer list",             admin: true, manager: true, staff: true, customer: false },
      { label: "Add new customer",               admin: true, manager: true, staff: true, customer: false },
      { label: "Edit customer details",          admin: true, manager: true, staff: true, customer: false },
      { label: "Delete / deactivate customer",   admin: true, manager: true, staff: false, customer: false },
      { label: "Bulk import customers (CSV)",    admin: true, manager: true, staff: true, customer: false },
      { label: "View own profile (portal)",      admin: false, manager: false, staff: false, customer: true },
    ],
  },
  {
    category: "Transactions & Billing",
    items: [
      { label: "View transactions",              admin: true, manager: true, staff: true, customer: false },
      { label: "Create new bill / transaction",  admin: true, manager: true, staff: true, customer: false },
      { label: "Edit transaction",               admin: true, manager: true, staff: false, customer: false },
      { label: "Record payment",                 admin: true, manager: true, staff: true, customer: false },
      { label: "Generate invoice PDF",           admin: true, manager: true, staff: true, customer: true },
      { label: "Send WhatsApp / SMS reminder",   admin: true, manager: true, staff: true, customer: false },
    ],
  },
  {
    category: "Girvi (Pledge Loans)",
    items: [
      { label: "View girvi list",                admin: true, manager: true, staff: true, customer: false },
      { label: "Create new girvi loan",          admin: true, manager: true, staff: true, customer: false },
      { label: "Record interest payment",        admin: true, manager: true, staff: true, customer: false },
      { label: "Close / release girvi",          admin: true, manager: true, staff: true, customer: false },
    ],
  },
  {
    category: "Inventory & Stock",
    items: [
      { label: "View inventory pieces",          admin: true, manager: true, staff: true, customer: false },
      { label: "Add / edit pieces",              admin: true, manager: true, staff: true, customer: false },
      { label: "View stock items",               admin: true, manager: true, staff: true, customer: false },
      { label: "Add / adjust stock",             admin: true, manager: true, staff: true, customer: false },
      { label: "Delete stock item",              admin: true, manager: true, staff: false, customer: false },
    ],
  },
  {
    category: "Orders & Karigars",
    items: [
      { label: "View orders",                    admin: true, manager: true, staff: true, customer: false },
      { label: "Create / update order",          admin: true, manager: true, staff: true, customer: false },
      { label: "View own orders (portal)",       admin: false, manager: false, staff: false, customer: true },
      { label: "Manage karigars",                admin: true, manager: true, staff: false, customer: false },
      { label: "Assign order to karigar",        admin: true, manager: true, staff: true, customer: false },
    ],
  },
  {
    category: "Metal Rates & Exchange",
    items: [
      { label: "View metal rates",               admin: true, manager: true, staff: true, customer: false },
      { label: "Set / update metal rates",       admin: true, manager: true, staff: false, customer: false },
      { label: "Fetch live rates",               admin: true, manager: true, staff: false, customer: false },
      { label: "Record metal exchange",          admin: true, manager: true, staff: true, customer: false },
    ],
  },
  {
    category: "Reports & Analytics",
    items: [
      { label: "View dashboard / charts",        admin: true, manager: true, staff: false, customer: false },
      { label: "Export CSV reports",             admin: true, manager: true, staff: false, customer: false },
      { label: "Export Excel reports",           admin: true, manager: true, staff: false, customer: false },
      { label: "View GST reports",               admin: true, manager: true, staff: false, customer: false },
      { label: "View audit activity log",        admin: true, manager: false, staff: false, customer: false },
    ],
  },
  {
    category: "Loyalty Points",
    items: [
      { label: "View customer loyalty balance",  admin: true, manager: true, staff: true, customer: false },
      { label: "Award points manually",          admin: true, manager: true, staff: true, customer: false },
      { label: "Redeem points",                  admin: true, manager: true, staff: true, customer: false },
      { label: "Adjust / correct points",        admin: true, manager: true, staff: false, customer: false },
      { label: "Configure loyalty programme",    admin: true, manager: true, staff: false, customer: false },
    ],
  },
  {
    category: "Staff & User Management",
    items: [
      { label: "View staff list",                admin: true, manager: true, staff: false, customer: false },
      { label: "Add / edit staff",               admin: true, manager: false, staff: false, customer: false },
      { label: "Deactivate staff",               admin: true, manager: false, staff: false, customer: false },
    ],
  },
  {
    category: "Store & Subscription",
    items: [
      { label: "View store settings",            admin: true, manager: true, staff: false, customer: false },
      { label: "Edit store settings",            admin: true, manager: false, staff: false, customer: false },
      { label: "View subscription / billing",    admin: true, manager: true, staff: false, customer: false },
      { label: "Manage all stores (super-admin)",admin: true, manager: false, staff: false, customer: false },
    ],
  },
];

const ROLE_META = {
  admin:    { label: "Admin",    color: "bg-red-100 text-red-700 border-red-200",       dot: "bg-red-500" },
  manager:  { label: "Manager",  color: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  staff:    { label: "Staff",    color: "bg-blue-100 text-blue-700 border-blue-200",    dot: "bg-blue-500" },
  customer: { label: "Customer", color: "bg-gray-100 text-gray-600 border-gray-200",   dot: "bg-gray-400" },
};

function RoleIcon({ hasAccess }) {
  return hasAccess ? (
    <span className="text-green-500 text-lg">✓</span>
  ) : (
    <span className="text-gray-300 text-lg">—</span>
  );
}

export default function RolePermissionsPage() {
  const [filter, setFilter] = useState("");
  const [highlightRole, setHighlightRole] = useState(null);

  const filtered = PERMISSIONS.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      !filter || item.label.toLowerCase().includes(filter.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  return (
    <ShopLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Role Permissions</h1>
          <p className="text-gray-500 text-sm mt-1">
            Reference guide for what each role can access. Backend enforces these rules — this page is read-only.
          </p>
        </div>

        {/* Role legend */}
        <div className="flex flex-wrap gap-2 mb-5">
          {ROLES.map(role => {
            const meta = ROLE_META[role];
            return (
              <button
                key={role}
                onClick={() => setHighlightRole(highlightRole === role ? null : role)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${meta.color} ${highlightRole === role ? "ring-2 ring-offset-1 ring-indigo-400" : "opacity-80 hover:opacity-100"}`}
              >
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                {meta.label}
              </button>
            );
          })}
          {highlightRole && (
            <span className="text-xs text-indigo-600 self-center ml-1 font-medium">
              Showing {ROLE_META[highlightRole].label} only
            </span>
          )}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search permissions…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full md:w-64 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Permission table */}
        <div className="space-y-6">
          {filtered.map(cat => (
            <div key={cat.category} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Category header */}
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
                <h2 className="font-semibold text-gray-700 text-sm">{cat.category}</h2>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                      <th className="text-left px-4 py-2 font-medium">Permission</th>
                      {ROLES.map(role => (
                        <th
                          key={role}
                          className={`text-center px-4 py-2 font-medium w-24 ${highlightRole === role ? "bg-indigo-50 text-indigo-600" : ""}`}
                        >
                          {ROLE_META[role].label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items
                      .filter(item => !highlightRole || item[highlightRole])
                      .map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 text-gray-700">{item.label}</td>
                          {ROLES.map(role => (
                            <td
                              key={role}
                              className={`text-center px-4 py-2.5 ${highlightRole === role ? "bg-indigo-50" : ""}`}
                            >
                              <RoleIcon hasAccess={item[role]} />
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-semibold mb-1">📋 How roles are assigned</p>
          <ul className="list-disc list-inside space-y-1 text-blue-600 text-xs">
            <li><strong>Admin</strong> — system super-admin, manages all stores and users</li>
            <li><strong>Manager</strong> — store manager: can see reports, configure settings, manage staff</li>
            <li><strong>Staff</strong> — counter staff: can add customers, create bills, manage daily operations</li>
            <li><strong>Customer</strong> — portal-only access: can view own invoices and orders via the customer portal</li>
          </ul>
        </div>
      </div>
    </ShopLayout>
  );
}
