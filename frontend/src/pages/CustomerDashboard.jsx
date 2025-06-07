import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import AddCustomerDrawer from "../components/ui/AddCustomer";
import BuyProduct from "../components/ui/BuyProduct";
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmationPop'; 

export default function CustomerDashboard() {
  const [showDrawer, setShowDrawer] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showBuyPopup, setShowBuyPopup] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
 
  const navigate = useNavigate();

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

      const res = await fetch(`http://localhost:5000/api/customer/all?${query.toString()}`);
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setIsLoading(false);
    }
  };


  const handleAddCustomer = async (customerData) => {
    debugger;
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
    };
  
    try {
      const url = selectedCustomer
        ? `http://localhost:5000/api/customer/update/${selectedCustomer.id}`
        : "http://localhost:5000/api/customer/add";
  
      const method = selectedCustomer ? "PUT" : "POST";
  
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      if (res.ok) {
        setShowDrawer(false);
        setSelectedCustomer(null);
        fetchCustomers();
      } else {
        alert("Failed to save customer");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
  
    try {
      const res = await fetch(`http://localhost:5000/api/customer/delete/${customerToDelete.id}`, {
        method: 'DELETE',
      });
  
      if (res.ok) {
        setCustomers(customers.filter((c) => c.id !== customerToDelete.id));
        setShowDeleteModal(false);
        setCustomerToDelete(null);
      } else {
        alert("Failed to delete customer.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Something went wrong.");
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
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.primary_phone.includes(searchTerm) ||
      customer.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      !filter ||
      (filter === "paid" && customer.status === "paid") ||
      (filter === "due" && customer.status === "due");

    return matchesSearch && matchesFilter;
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (!sort) return 0;
    switch (sort) {
      case "recent":
        return new Date(b.createdAt) - new Date(a.createdAt);
      case "oldest":
        return new Date(a.createdAt) - new Date(b.createdAt);
      case "highest":
        return (b.total_amount || 0) - (a.total_amount || 0);
      case "least":
        return (a.total_amount || 0) - (b.total_amount || 0);
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Customers</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
  {/* Search Bar */}
  <div className="relative">
    <Input
      placeholder="Search customers..."
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
      { label: "All Status", value: "" },
      { label: "Paid", value: "paid" },
      { label: "Due", value: "due" },
    ]}
  />

  {/* Sort Dropdown */}
  <Select
    value={sort}
    onChange={(e) => setSort(e.target.value)}
    className="w-full"
    options={[
      { label: "Sort By", value: "" },
      { label: "Newest", value: "recent" },
      { label: "Oldest", value: "oldest" },
      { label: "Name (A-Z)", value: "name" },
    ]}
  />

  {/* Add Button */}
  <div className="flex sm:justify-end">
    <Button onClick={() => setShowDrawer(true)} className="w-full sm:w-auto bg-blue-600 text-white">
      + Add Customer
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
            <h3 className="text-lg font-semibold text-gray-900">No customers found</h3>
            <p className="text-gray-500">
              {searchTerm || filter
                ? "Try changing search or filter"
                : "Add your first customer to get started."}
            </p>
            <div className="mt-4">
              <Button onClick={() => setShowDrawer(true)} className="bg-blue-600 text-white">
                + Add Customer
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Location</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
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
                        customer.status === "paid" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {customer.status || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => navigate(`/customer/${customer.id}`)} className="text-blue-600">View</button>
                      <button onClick={() => { setSelectedCustomer(customer); setShowBuyPopup(true); }} className="text-green-600">Buy</button>
                      <button onClick={() => { setSelectedCustomer(customer); setShowDrawer(true); }} className="text-yellow-600">Edit</button>
                      <button onClick={() => { setCustomerToDelete(customer); setShowDeleteModal(true); }} className="text-red-600">Delete</button>

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        setSelectedCustomer(null); // reset selected customer on close
        }}
      onAdd={handleAddCustomer}
      initialData={selectedCustomer}
      />

      <ConfirmDialog
        open={showDeleteModal}
        title="Delete Customer"
        content="Are you sure you want to delete this customer? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
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
    </div>
  );
}
