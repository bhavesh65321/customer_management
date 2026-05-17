import React, { useEffect, useState, useCallback } from "react";
import AddCustomerDrawer from "../components/ui/AddCustomer";
import ShopLayout from "../components/layout/ShopLayout";
import { Link, useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/ui/ConfirmationPop";
import InlineError from "../components/ui/InlineError";
import { useLanguage } from "../context/LanguageContext";
import { authHeaders, API_BASE } from "../api";
import { SkeletonCustomerList } from "../components/ui/Skeleton";

export default function CustomerDashboard() {
  const [showDrawer, setShowDrawer] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState("active");
  const [sort, setSort] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [formError, setFormError] = useState("");

  const navigate = useNavigate();
  const { t } = useLanguage();

  // Debounce search — wait 350 ms after last keystroke before firing API
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (debouncedSearch.trim()) query.append("search", debouncedSearch.trim());
      query.append("status", filter || "active");
      if (sort) query.append("sort", sort);
      const res = await fetch(`${API_BASE}/api/customer/list?${query.toString()}`, {
        headers: authHeaders(),
      });
      if (res.status === 401) { navigate("/login"); return; }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        const detail = d.detail;
        const msg = Array.isArray(detail)
          ? detail.map((x) => (typeof x === "object" && x.msg) || JSON.stringify(x)).join("; ")
          : detail || `Failed to load customers (${res.status})`;
        setFormError(msg);
        setCustomers([]);
        return;
      }
      setFormError("");
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching customers:", err);
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, filter, sort, navigate]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);


  const handleAddCustomer = async (customerData) => {
    setFormError("");
    const payload = {
      name: customerData.name,
      father_name: customerData.fatherName,
      primary_phone: customerData.phonePrimary,
      secondary_phone: customerData.phoneSecondary,
      address: customerData.address,
      city: customerData.city,
      pincode: customerData.pincode,
      gender: customerData.gender,
      country: customerData.country,
      email: customerData.email,
    };
    try {
      const url = selectedCustomer
        ? `${API_BASE}/api/customer/update/${selectedCustomer.id}`
        : `${API_BASE}/api/customer/add`;
      const method = selectedCustomer ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (res.ok) {
        setShowDrawer(false);
        setSelectedCustomer(null);
        setFormError("");
        fetchCustomers();
        return;
      }
      const d = await res.json().catch(() => ({}));
      // Backend can return: { detail: "..." } or { error: { message: "..." } }
      const backendMsg = d.detail || d.error?.message || d.message || "Failed to save customer";
      const msg = res.status === 400
        ? backendMsg                          // show backend message as-is for validation errors
        : `${res.status}: ${backendMsg}`;
      setFormError(msg);
      throw new Error(msg);
    } catch (err) {
      console.error(err);
      if (err.message && !formError) setFormError(err.message);
      throw err;
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/customer/delete/${customerToDelete.id}`,
        { method: "DELETE", headers: authHeaders() }
      );
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (res.ok) {
        setCustomers(customers.filter((c) => c.id !== customerToDelete.id));
        setShowDeleteModal(false);
        setCustomerToDelete(null);
      } else {
        const d = await res.json().catch(() => ({}));
        setFormError(`${res.status}: ${d.detail || "Failed to deactivate customer."}`);
      }
    } catch (err) {
      console.error("Deactivate error:", err);
      setFormError(err.message || "Something went wrong. Please try again.");
    }
  };
  
  

  const isDefaultListView = !searchTerm.trim() && filter === "active" && !sort;

  return (
    <ShopLayout>
      <div className="max-w-7xl mx-auto w-full min-w-0">
        {!showDrawer && formError && (
          <InlineError message={formError} onDismiss={() => setFormError("")} className="mb-4" />
        )}

        {/* ── Header row ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("customer.title")}</h1>
            {!isLoading && (
              <p className="text-sm text-gray-400 mt-0.5">
                {customers.length > 0
                  ? `${customers.length} customer${customers.length !== 1 ? "s" : ""}`
                  : "No customers yet"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/import-customers"
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium whitespace-nowrap"
            >
              {t("customer.importCustomersLink")}
            </Link>
            <button
              type="button"
              onClick={() => { setFormError(""); setShowDrawer(true); }}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 whitespace-nowrap shadow-sm"
            >
              + {t("customer.addCustomer")}
            </button>
          </div>
        </div>

        {/* ── Filter bar ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.82 3.906l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              placeholder={t("customer.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status pills */}
          <div className="flex gap-1.5">
            {[
              { label: t("customer.filterActive"), value: "active" },
              { label: t("customer.filterInactive"), value: "inactive" },
              { label: t("customer.filterAll"), value: "all" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap
                  ${filter === opt.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort select */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            <option value="">{t("customer.sortBy")}</option>
            <option value="recent">{t("customer.sortNewest")}</option>
            <option value="oldest">{t("customer.sortOldest")}</option>
            <option value="name">{t("customer.sortName")}</option>
          </select>
        </div>

        {/* ── Content ────────────────────────────────────────────────── */}
        {isLoading ? (
          <SkeletonCustomerList />
        ) : customers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{t("customer.noCustomersFound")}</h3>
            <p className="text-sm text-gray-500">
              {isDefaultListView ? t("customer.addFirstCustomer") : t("customer.tryChangingFilter")}
            </p>
            {isDefaultListView && (
              <p className="text-xs text-gray-400 mt-3">
                Use the <span className="font-semibold text-blue-600">+ {t("customer.addCustomer")}</span> button above to get started.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-100">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("customer.tableName")}</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("customer.tableContact")}</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("customer.tableLocation")}</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("customer.tableStatus")}</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("customer.tableActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{customer.name}</div>
                        <div className="text-gray-500">{customer.father_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{customer.primary_phone}</div>
                        <div className="text-gray-500 text-xs">{customer.secondary_phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{customer.city}</div>
                        <div className="text-gray-500 text-xs">{customer.country}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          customer.is_active !== false ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
                        }`}>
                          {customer.is_active !== false ? t("customer.active") : t("customer.inactive")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => navigate(`/customer/${customer.id}`)}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60"
                          >
                            {t("customer.view")}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/shop?customerId=${customer.id}`)}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
                          >
                            {t("customer.buy")}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSelectedCustomer(customer); setFormError(""); setShowDrawer(true); }}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
                          >
                            {t("customer.edit")}
                          </button>
                          {customer.is_active !== false && (
                            <button
                              type="button"
                              onClick={() => { setCustomerToDelete(customer); setShowDeleteModal(true); }}
                              className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60"
                            >
                              {t("customer.deactivate")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden space-y-3">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 p-4"
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">{customer.name}</div>
                      <div className="text-gray-500 text-sm">{customer.father_name}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                      customer.is_active !== false ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
                    }`}>
                      {customer.is_active !== false ? t("customer.active") : t("customer.inactive")}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    <div>{customer.primary_phone}</div>
                    <div>{[customer.city, customer.country].filter(Boolean).join(", ") || "—"}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/customer/${customer.id}`)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60"
                    >
                      {t("customer.view")}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/shop?customerId=${customer.id}`)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
                    >
                      {t("customer.buy")}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedCustomer(customer); setFormError(""); setShowDrawer(true); }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
                    >
                      {t("customer.edit")}
                    </button>
                    {customer.is_active !== false && (
                      <button
                        type="button"
                        onClick={() => { setCustomerToDelete(customer); setShowDeleteModal(true); }}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60"
                      >
                        {t("customer.deactivate")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {/* <AddCustomerDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        onAdd={handleAddCustomer}
      /> */}
      
      <AddCustomerDrawer
        isOpen={showDrawer}
        onClose={() => {
          setShowDrawer(false);
          setSelectedCustomer(null);
          setFormError("");
        }}
        onAdd={handleAddCustomer}
        initialData={selectedCustomer}
        error={formError}
        onClearError={() => setFormError("")}
      />

      <ConfirmDialog
        open={showDeleteModal}
        title={t("customer.deactivateTitle")}
        content={t("customer.deactivateContent")}
        confirmText={t("customer.deactivate")}
        cancelText={t("common.cancel")}
        onConfirm={handleDeleteCustomer}
        onCancel={() => setShowDeleteModal(false)}
      />

    </ShopLayout>
  );
}
