import React, { useState, useEffect } from "react";
import AddCustomerDrawer from "../ui/AddCustomer";
import { authHeaders, API_BASE } from "../../api";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];
const avatarColor = (name = "") =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] || AVATAR_COLORS[0];

// ── localStorage helpers for recently billed ──────────────────────────────
const RECENT_KEY = "recentlyBilledCustomers";
const MAX_RECENT = 5;

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}

function saveRecent(customer) {
  try {
    const prev = getRecent().filter((c) => c.id !== customer.id);
    const next = [{ id: customer.id, name: customer.name, primary_phone: customer.primary_phone }, ...prev].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

export default function CustomerSelectionStep({
  customerMode,
  onModeChange,
  customersList,
  searchQuery,
  onSearchChange,
  onSelectCustomer,
}) {
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [addError, setAddError] = useState("");
  const [recentCustomers, setRecentCustomers] = useState([]);

  useEffect(() => {
    setRecentCustomers(getRecent());
  }, []);

  const filtered = searchQuery
    ? customersList.filter(
        (c) =>
          c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.primary_phone?.includes(searchQuery)
      )
    : customersList;

  const handleSelect = (customer) => {
    saveRecent(customer);
    setRecentCustomers(getRecent());
    onSelectCustomer(customer);
  };

  const handleAdd = async (formData) => {
    setAddError("");
    try {
      const payload = {
        name: formData.name,
        father_name: formData.fatherName,
        primary_phone: formData.phonePrimary,
        secondary_phone: formData.phoneSecondary || null,
        address: formData.address || null,
        city: formData.city || null,
        pincode: formData.pincode || null,
        gender: formData.gender,
        country: formData.country || "India",
        email: formData.email || null,
      };
      const res = await fetch(`${API_BASE}/api/customer/add`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        const msg = d.detail || "Failed to add customer";
        setAddError(msg);
        throw new Error(msg);
      }
      const created = await res.json();
      setShowAddDrawer(false);
      setAddError("");
      handleSelect(created);
    } catch (err) {
      if (err.message && !addError) setAddError(err.message);
      throw err;
    }
  };

  // Pre-fill name from search when opening add drawer
  const openAddDrawer = () => {
    setAddError("");
    setShowAddDrawer(true);
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Mode tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { value: "existing", label: "Existing Customer" },
            { value: "new", label: "New Customer" },
          ].map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onModeChange(m.value)}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${
                customerMode === m.value
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/40"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── Existing customer ─────────────────────────────────── */}
          {customerMode === "existing" && (
            <div>
              {/* Recently billed quick-select */}
              {recentCustomers.length > 0 && !searchQuery && (
                <div className="mb-5">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Recently Billed
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recentCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          // find full customer object from list if available, else use cached
                          const full = customersList.find((x) => x.id === c.id) || c;
                          handleSelect(full);
                        }}
                        className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl text-sm transition-colors group"
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(c.name)}`}>
                          {c.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <span className="font-medium text-gray-700 group-hover:text-blue-700">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search input */}
              <div className="relative mb-4">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  autoFocus
                  placeholder="Search by name or phone…"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-lg leading-none"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Results or zero-state */}
              {filtered.length === 0 ? (
                <div className="py-8 text-center">
                  {searchQuery ? (
                    <>
                      <p className="text-gray-500 text-sm font-medium mb-1">
                        No customer found for "<span className="text-gray-800">{searchQuery}</span>"
                      </p>
                      <p className="text-gray-400 text-xs mb-4">
                        Want to add them as a new customer?
                      </p>
                      <button
                        type="button"
                        onClick={openAddDrawer}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-sm transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add "{searchQuery}" as new customer
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-400 text-sm">Start typing to search customers.</p>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto rounded-xl border border-gray-100">
                  {filtered.slice(0, 60).map((c) => (
                    <li
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50/50 cursor-pointer transition-colors group"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(c.name)}`}>
                        {c.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.primary_phone || "No phone"}</p>
                      </div>
                      <span className="text-xs text-blue-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        Select →
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {filtered.length > 0 && (
                <p className="mt-4 text-center text-xs text-gray-400">
                  Not listed?{" "}
                  <button
                    type="button"
                    onClick={() => onModeChange("new")}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Add new customer
                  </button>
                </p>
              )}
            </div>
          )}

          {/* ── New customer ──────────────────────────────────────── */}
          {customerMode === "new" && (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800 mb-1">Add a new customer</p>
                <p className="text-xs text-gray-400">Enter their name and phone to get started</p>
              </div>
              <button
                type="button"
                onClick={openAddDrawer}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-sm transition-colors"
              >
                + New Customer
              </button>
              <p className="text-xs text-gray-400">
                Already have them?{" "}
                <button
                  type="button"
                  onClick={() => onModeChange("existing")}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Search existing customers
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AddCustomerDrawer — on success immediately selects customer & proceeds to billing */}
      <AddCustomerDrawer
        isOpen={showAddDrawer}
        onClose={() => { setShowAddDrawer(false); setAddError(""); }}
        onAdd={handleAdd}
        error={addError}
        onClearError={() => setAddError("")}
      />

    </>
  );
}
