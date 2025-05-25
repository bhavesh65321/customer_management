import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import AddCustomerDrawer from "../components/ui/AddCustomer";
import BuyProduct from "../components/ui/BuyProduct";
import { useNavigate } from 'react-router-dom';



export default function CustomerDashboard() {
  const [showDrawer, setShowDrawer] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showBuyPopup, setShowBuyPopup] = useState(false);
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

      const res = await fetch(`http://localhost:8000/api/customer/all?${query.toString()}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setCustomers(data);
      } else {
        console.error("Unexpected response", data);
        setCustomers([]);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCustomer = async (customerData) => {
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
      const res = await fetch("http://localhost:8000/api/customer/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowDrawer(false);
        fetchCustomers();
      } else {
        alert("Failed to add customer");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  };

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with search and actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative flex-grow sm:w-64">
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full sm:w-40"
              options={[
                { label: "All Status", value: "" },
                { label: "Paid", value: "paid" },
                { label: "Due", value: "due" },
              ]}
            />
            
            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full sm:w-40"
              options={[
                { label: "Sort By", value: "" },
                { label: "Newest", value: "recent" },
                { label: "Oldest", value: "oldest" },
                { label: "Name (A-Z)", value: "name" },
              ]}
            />
            
            <Button
              onClick={() => setShowDrawer(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Customer
            </Button>
          </div>
        </div>

        {/* Main Content */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : sortedCustomers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="max-w-md mx-auto">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No customers found</h3>
              <p className="mt-2 text-gray-500">
                {searchTerm || filter 
                  ? "Try adjusting your search or filter criteria"
                  : "Get started by adding your first customer"}
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => setShowDrawer(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Customer
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedCustomers.map((customer) => (
                    <tr key={customers.id} customer={customer} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {customer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                            {customer.father_name && (
                              <div className="text-sm text-gray-500">{customer.father_name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.primary_phone}</div>
                        {customer.secondary_phone && (
                          <div className="text-sm text-gray-500">{customer.secondary_phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.city}</div>
                        <div className="text-sm text-gray-500">{customer.country}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          customer.status === "paid" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {customer.status || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                      onClick={() => navigate(`/customer/${customer.id}`)}
                      className="text-blue-600 hover:text-blue-800 mr-3">
                       View Account
                     </button>

                      <button 
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setShowBuyPopup(true);
                      }} 
                      className="text-green-600 hover:text-green-800 mr-3"
                      >
                      Buy
                        </button>
                        <button className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                        <button className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AddCustomerDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        onAdd={handleAddCustomer}
      />

    { 
      showBuyPopup && selectedCustomer && (
     <BuyProduct
      customer={selectedCustomer}
      isOpen={showBuyPopup}
      onClose={() => setShowBuyPopup(false)}
     />
    )}
    </div>
  );
}