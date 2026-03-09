import React from "react";
import { CUSTOMER_FORM_INITIAL } from "../../utils/customerPayload";

export default function CustomerSelectionStep({
  customerMode,
  onModeChange,
  newCustomer,
  onNewCustomerChange,
  customersList,
  searchQuery,
  onSearchChange,
  onSelectCustomer,
  onCreateCustomer,
  loading,
}) {
  const filteredCustomers = searchQuery
    ? customersList.filter(
        (c) =>
          c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.primary_phone?.includes(searchQuery)
      )
    : customersList;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Select or add customer</h2>
      <div className="flex gap-4 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="mode"
            checked={customerMode === "new"}
            onChange={() => onModeChange("new")}
          />
          <span>New customer</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="mode"
            checked={customerMode === "existing"}
            onChange={() => onModeChange("existing")}
          />
          <span>Existing customer</span>
        </label>
      </div>

      {customerMode === "new" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {Object.keys(CUSTOMER_FORM_INITIAL).map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </label>
              <input
                type={key === "email" ? "email" : "text"}
                value={newCustomer[key] ?? ""}
                onChange={(e) => onNewCustomerChange({ ...newCustomer, [key]: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          ))}
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={onCreateCustomer}
              disabled={loading || !newCustomer.name || !newCustomer.phonePrimary}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create customer & continue to sale"}
            </button>
          </div>
        </div>
      )}

      {customerMode === "existing" && (
        <div>
          <input
            type="text"
            placeholder="Search by name or phone"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md mb-4"
          />
          <ul className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {filteredCustomers.slice(0, 50).map((c) => (
              <li
                key={c.id}
                className="px-4 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
                onClick={() => onSelectCustomer(c)}
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-sm text-gray-500">{c.primary_phone}</span>
              </li>
            ))}
          </ul>
          {filteredCustomers.length === 0 && (
            <p className="text-gray-500 py-4">No customers found.</p>
          )}
        </div>
      )}
    </div>
  );
}
