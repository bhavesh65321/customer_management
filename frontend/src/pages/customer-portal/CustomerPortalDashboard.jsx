import React from "react";
import { Link } from "react-router-dom";

export default function CustomerPortalDashboard() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">My account</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/customer/profile"
          className="block p-5 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm"
        >
          <h2 className="font-medium text-gray-900">Profile</h2>
          <p className="text-sm text-gray-500 mt-1">View and update your details</p>
        </Link>
        <Link
          to="/customer/invoices"
          className="block p-5 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm"
        >
          <h2 className="font-medium text-gray-900">Invoices</h2>
          <p className="text-sm text-gray-500 mt-1">Download your invoices</p>
        </Link>
        <Link
          to="/customer/orders"
          className="block p-5 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm"
        >
          <h2 className="font-medium text-gray-900">My purchases</h2>
          <p className="text-sm text-gray-500 mt-1">View purchase history</p>
        </Link>
      </div>
    </div>
  );
}
