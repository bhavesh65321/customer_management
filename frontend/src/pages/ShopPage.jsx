import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ShopLayout from "../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../api";
import { XMarkIcon } from "@heroicons/react/24/outline";

const initialProduct = {
  productName: "",
  metalType: "gold",
  weight: "",
  rate: "",
  makingCharge: "",
  diamondCharge: "",
  gstPercent: "3",
};

const newCustomerFields = {
  name: "",
  fatherName: "",
  phonePrimary: "",
  phoneSecondary: "",
  email: "",
  address: "",
  city: "",
  pincode: "",
  gender: "Male",
  country: "India",
};

export default function ShopPage() {
  const [searchParams] = useSearchParams();
  const customerIdFromUrl = searchParams.get("customerId");

  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState(null);
  const [customerMode, setCustomerMode] = useState("new");
  const [newCustomer, setNewCustomer] = useState(newCustomerFields);
  const [customersList, setCustomersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState(false);

  const [products, setProducts] = useState([{ ...initialProduct }]);
  const [paidAmount, setPaidAmount] = useState("");

  useEffect(() => {
    if (!customerIdFromUrl) return;
    const fetchCustomer = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/customer/${customerIdFromUrl}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setCustomer(data);
          setStep(2);
        }
      } catch {
        // leave step 1 if fetch fails
      }
    };
    fetchCustomer();
  }, [customerIdFromUrl]);

  useEffect(() => {
    if (step === 1 && customerMode === "existing") {
      const fetchCustomers = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/customer/all`, { headers: authHeaders() });
          if (res.ok) {
            const data = await res.json();
            setCustomersList(Array.isArray(data) ? data : []);
          }
        } catch {
          setCustomersList([]);
        }
      };
      fetchCustomers();
    }
  }, [step, customerMode]);

  const filteredCustomers = searchQuery
    ? customersList.filter(
        (c) =>
          c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.primary_phone?.includes(searchQuery)
      )
    : customersList;

  const handleCreateCustomer = async () => {
    setLoading(true);
    try {
      const payload = {
        name: newCustomer.name,
        father_name: newCustomer.fatherName,
        primary_phone: newCustomer.phonePrimary,
        secondary_phone: newCustomer.phoneSecondary || null,
        address: newCustomer.address || null,
        city: newCustomer.city || null,
        pincode: newCustomer.pincode || null,
        gender: newCustomer.gender,
        country: newCustomer.country,
        email: newCustomer.email || null,
      };
      const res = await fetch(`${API_BASE}/api/customer/add`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to add customer");
      }
      const created = await res.json();
      setCustomer(created);
      setStep(2);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const parseNumber = (v) => parseFloat(v) || 0;
  const calculatedProducts = products.map((p) => {
    const weight = parseNumber(p.weight);
    const rate = parseNumber(p.rate);
    const makingCharge = parseNumber(p.makingCharge);
    const diamondCharge = parseNumber(p.diamondCharge);
    const gstPercent = parseNumber(p.gstPercent);
    const metalValue = weight * rate;
    const taxableAmount = metalValue + makingCharge;
    const gstAmount = (taxableAmount * gstPercent) / 100;
    const total = metalValue + makingCharge + diamondCharge + gstAmount;
    return { ...p, metalValue, gstAmount, total };
  });
  const grandTotal = calculatedProducts.reduce((s, p) => s + p.total, 0);
  const dueAmount = grandTotal - parseNumber(paidAmount);

  const handleProductChange = (index, field, value) => {
    const next = [...products];
    next[index] = { ...next[index], [field]: value };
    setProducts(next);
  };

  const addProduct = () => setProducts([...products, { ...initialProduct }]);
  const removeProduct = (i) => products.length > 1 && setProducts(products.filter((_, j) => j !== i));

  const getWeightUnit = (metalType) =>
    metalType === "silver" ? "kg" : metalType === "diamond" ? "pieces" : "g";

  const handleSaleSubmit = async () => {
    if (!customer?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/transactions/add`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          customerId: customer.id,
          customerName: customer.name,
          products: calculatedProducts,
          paidAmount: parseNumber(paidAmount),
          dueAmount: Math.max(dueAmount, 0),
          grandTotal,
          date: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save transaction");
      setSaleSuccess(true);
      setProducts([{ ...initialProduct }]);
      setPaidAmount("");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetToCustomer = () => {
    setStep(1);
    setCustomer(null);
    setSaleSuccess(false);
    setNewCustomer(newCustomerFields);
  };

  const resetToSale = () => {
    setSaleSuccess(false);
    setProducts([{ ...initialProduct }]);
    setPaidAmount("");
  };

  return (
    <ShopLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Shop</h1>

        {step === 1 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Select or add customer</h2>
            <div className="flex gap-4 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={customerMode === "new"}
                  onChange={() => setCustomerMode("new")}
                />
                <span>New customer</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={customerMode === "existing"}
                  onChange={() => setCustomerMode("existing")}
                />
                <span>Existing customer</span>
              </label>
            </div>

            {customerMode === "new" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {Object.keys(newCustomerFields).map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </label>
                    <input
                      type={key === "email" ? "email" : "text"}
                      value={newCustomer[key]}
                      onChange={(e) => setNewCustomer((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={handleCreateCustomer}
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md mb-4"
                />
                <ul className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {filteredCustomers.slice(0, 50).map((c) => (
                    <li
                      key={c.id}
                      className="px-4 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setCustomer(c);
                        setStep(2);
                      }}
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
        )}

        {step === 2 && customer && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            {saleSuccess ? (
              <div className="text-center py-8">
                <p className="text-lg font-medium text-green-700 mb-4">Transaction saved successfully.</p>
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={resetToSale}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add another sale
                  </button>
                  <button
                    type="button"
                    onClick={resetToCustomer}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Back to Shop
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">
                    New purchase for {customer.name}
                  </h2>
                  <button
                    type="button"
                    onClick={resetToCustomer}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Change customer
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-gray-700">Products</h3>
                    <button
                      type="button"
                      onClick={addProduct}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      + Add product
                    </button>
                  </div>
                  {products.map((product, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg relative">
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProduct(index)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Product name</label>
                          <input
                            type="text"
                            value={product.productName}
                            onChange={(e) => handleProductChange(index, "productName", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Metal type</label>
                          <select
                            value={product.metalType}
                            onChange={(e) => handleProductChange(index, "metalType", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="gold">Gold (per gram)</option>
                            <option value="silver">Silver (per kg)</option>
                            <option value="platinum">Platinum (per gram)</option>
                            <option value="diamond">Diamond (per piece)</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Weight ({getWeightUnit(product.metalType)})
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={product.weight}
                            onChange={(e) => handleProductChange(index, "weight", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Rate</label>
                          <input
                            type="number"
                            min="0"
                            value={product.rate}
                            onChange={(e) => handleProductChange(index, "rate", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Making charge (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={product.makingCharge}
                            onChange={(e) => handleProductChange(index, "makingCharge", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Diamond charge (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={product.diamondCharge}
                            onChange={(e) => handleProductChange(index, "diamondCharge", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">GST (%)</label>
                          <select
                            value={product.gstPercent}
                            onChange={(e) => handleProductChange(index, "gstPercent", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="1.5">1.5%</option>
                            <option value="3">3%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="0">0%</option>
                          </select>
                        </div>
                        <div className="md:col-span-2 text-sm text-gray-600">
                          Total: ₹{calculatedProducts[index]?.total.toFixed(2) ?? "0.00"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Grand total</span>
                    <div className="font-bold text-gray-900">₹{grandTotal.toFixed(2)}</div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Paid amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Due</span>
                    <div className={`font-bold ${dueAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                      ₹{Math.max(dueAmount, 0).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={handleSaleSubmit}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? "Saving…" : "Save transaction"}
                  </button>
                  <button
                    type="button"
                    onClick={resetToCustomer}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </ShopLayout>
  );
}
