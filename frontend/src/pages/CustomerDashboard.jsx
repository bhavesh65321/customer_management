import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import AddCustomerDrawer from "../components/ui/AddCustomer";
import BuyProduct from "../components/ui/BuyProduct";
import ShopLayout from "../components/layout/ShopLayout";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/ui/ConfirmationPop";
import InlineError from "../components/ui/InlineError";
import { useLanguage } from "../context/LanguageContext";
import { authHeaders, API_BASE } from "../api"; 

export default function CustomerDashboard() {
  const [showDrawer, setShowDrawer] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("active");
  const [sort, setSort] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showBuyPopup, setShowBuyPopup] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [formError, setFormError] = useState("");

  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm, filter, sort]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (searchTerm) query.append("search", searchTerm);
      if (filter) query.append("status", filter);
      if (sort) query.append("sort", sort);
      const res = await fetch(`${API_BASE}/api/customer/all?${query.toString()}`, {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setIsLoading(false);
    }
  };


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
      const msg = `${res.status}: ${d.detail || "Failed to save customer"}`;
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
  
  

  // const handleAddCustomer = async (customerData) => {
  //   const payload = {
  //     name: customerData.name,
  //     father_name: customerData.fatherName,
  //     primary_phone: customerData.phonePrimary,
  //     secondary_phone: customerData.phoneSecondary,
  //     address: customerData.address,
  //     city: customerData.city,
  //     pincode: customerData.pincode,
  //     gender: customerData.gender,
  //     country: customerData.country,
  //   };

  //   try {
  //     const res = await fetch("http://localhost:5000/api/customer/add", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(payload),
  //     });

  //     if (res.ok) {
  //       setShowDrawer(false);
  //       fetchCustomers();
  //     } else {
  //       alert("Failed to add customer");
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     alert("Something went wrong.");
  //   }
  // };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch =
      !searchTerm ||
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.primary_phone && String(customer.primary_phone).includes(searchTerm)) ||
      customer.city?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filter === "all" ||
      (filter === "active" && customer.is_active !== false) ||
      (filter === "inactive" && customer.is_active === false);

    return matchesSearch && matchesStatus;
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (!sort) return 0;
    switch (sort) {
      case "recent":
        return (b.id ?? 0) - (a.id ?? 0);
      case "oldest":
        return (a.id ?? 0) - (b.id ?? 0);
      case "name":
        return (a.name || "").localeCompare(b.name || "");
      default:
        return 0;
    }
  });

  return (
    <ShopLayout>
      <div className="max-w-7xl mx-auto w-full min-w-0">
        {!showDrawer && formError && (
          <InlineError message={formError} onDismiss={() => setFormError("")} className="mb-4" />
        )}
        <div className="flex flex-col gap-4 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{t("customer.title")}</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
  <div className="relative">
    <Input
      placeholder={t("customer.searchPlaceholder")}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full pl-10 pr-4 py-2"
    />
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.82 3.906l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387A6 6 0 012 8z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  </div>

  {/* Filter Dropdown */}
  <Select
    value={filter}
    onChange={(e) => setFilter(e.target.value)}
    className="w-full"
    options={[
      { label: t("customer.filterActive"), value: "active" },
      { label: t("customer.filterInactive"), value: "inactive" },
      { label: t("customer.filterAll"), value: "all" },
    ]}
  />

  <Select
    value={sort}
    onChange={(e) => setSort(e.target.value)}
    className="w-full"
    options={[
      { label: t("customer.sortBy"), value: "" },
      { label: t("customer.sortNewest"), value: "recent" },
      { label: t("customer.sortOldest"), value: "oldest" },
      { label: t("customer.sortName"), value: "name" },
    ]}
  />

  <div className="flex sm:justify-end">
    <Button onClick={() => { setFormError(""); setShowDrawer(true); }} className="w-full sm:w-auto bg-blue-600 text-white">
      + {t("customer.addCustomer")}
    </Button>
  </div>
</div>

        </div>

        {/* Customer Table */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : sortedCustomers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900">{t("customer.noCustomersFound")}</h3>
            <p className="text-gray-500">
              {searchTerm || filter
                ? t("customer.tryChangingFilter")
                : t("customer.addFirstCustomer")}
            </p>
            <div className="mt-4">
              <Button onClick={() => { setFormError(""); setShowDrawer(true); }} className="bg-blue-600 text-white">
                + {t("customer.addCustomer")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-100">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">{t("customer.tableName")}</th>
                    <th className="px-4 py-3 text-left">{t("customer.tableContact")}</th>
                    <th className="px-4 py-3 text-left">{t("customer.tableLocation")}</th>
                    <th className="px-4 py-3 text-left">{t("customer.tableStatus")}</th>
                    <th className="px-4 py-3 text-right">{t("customer.tableActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedCustomers.map((customer) => (
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
                            onClick={() => { setSelectedCustomer(customer); setShowBuyPopup(true); }}
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
              {sortedCustomers.map((customer) => (
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
                    <div>{customer.city}, {customer.country}</div>
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
                      onClick={() => { setSelectedCustomer(customer); setShowBuyPopup(true); }}
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

      {showBuyPopup && selectedCustomer && (
        <BuyProduct
          customer={selectedCustomer}
          isOpen={showBuyPopup}
          onClose={() => setShowBuyPopup(false)}
        />
      )}

    </ShopLayout>
  );
}
