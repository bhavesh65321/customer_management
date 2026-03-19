import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ShopLayout from "../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../api";
import { XMarkIcon } from "@heroicons/react/24/outline";
import CustomerSelectionStep from "../components/shop/CustomerSelectionStep";
import {
  INITIAL_PRODUCT,
  calculateAllProductTotals,
  grandTotalFromProducts,
  getWeightUnit,
  parseNumber,
} from "../utils/productCalculations";
import { CUSTOMER_FORM_INITIAL, customerFormToPayload } from "../utils/customerPayload";
import { PageContainer, SectionCard } from "../components/ui/PageSection";
import InlineError from "../components/ui/InlineError";

export default function ShopPage() {
  const [searchParams] = useSearchParams();
  const customerIdFromUrl = searchParams.get("customerId");

  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState(null);
  const [customerMode, setCustomerMode] = useState("new");
  const [newCustomer, setNewCustomer] = useState({ ...CUSTOMER_FORM_INITIAL });
  const [customersList, setCustomersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [error, setError] = useState("");

  const [products, setProducts] = useState([{ ...INITIAL_PRODUCT }]);
  const [paidAmount, setPaidAmount] = useState("");
  const [billType, setBillType] = useState("For Material");

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

  const handleCreateCustomer = async () => {
    setError("");
    setLoading(true);
    try {
      const payload = customerFormToPayload(newCustomer);
      const res = await fetch(`${API_BASE}/api/customer/add`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(`${res.status}: ${d.detail || "Failed to add customer"}`);
        return;
      }
      const created = await res.json();
      setCustomer(created);
      setStep(2);
    } catch (err) {
      setError(err.message || "Something went wrong.");
      return;
    } finally {
      setLoading(false);
    }
  };

  const calculatedProducts = calculateAllProductTotals(products);
  const grandTotal = grandTotalFromProducts(calculatedProducts);
  const dueAmount = grandTotal - parseNumber(paidAmount);

  const handleProductChange = (index, field, value) => {
    const next = [...products];
    next[index] = { ...next[index], [field]: value };
    setProducts(next);
  };

  const addProduct = () => setProducts([...products, { ...INITIAL_PRODUCT }]);
  const removeProduct = (i) => products.length > 1 && setProducts(products.filter((_, j) => j !== i));

  const handleSaleSubmit = async () => {
    if (!customer?.id) return;
    setError("");
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
          billType: billType || "For Material",
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(`${res.status}: ${d.detail || "Failed to save transaction"}`);
        return;
      }
      setSaleSuccess(true);
      setProducts([{ ...INITIAL_PRODUCT }]);
      setPaidAmount("");
    } catch (err) {
      setError(err.message || "Failed to save transaction.");
      return;
    } finally {
      setLoading(false);
    }
  };

  const resetToCustomer = () => {
    setStep(1);
    setCustomer(null);
    setSaleSuccess(false);
    setNewCustomer({ ...CUSTOMER_FORM_INITIAL });
  };

  const resetToSale = () => {
    setSaleSuccess(false);
    setProducts([{ ...INITIAL_PRODUCT }]);
    setPaidAmount("");
  };

  return (
    <ShopLayout>
      <PageContainer title="Shop" maxWidth="max-w-4xl">
        {error && (
          <InlineError message={error} onDismiss={() => setError("")} className="mb-4" />
        )}
        {step === 1 && (
          <CustomerSelectionStep
            customerMode={customerMode}
            onModeChange={setCustomerMode}
            newCustomer={newCustomer}
            onNewCustomerChange={setNewCustomer}
            customersList={customersList}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectCustomer={(c) => {
              setCustomer(c);
              setStep(2);
            }}
            onCreateCustomer={handleCreateCustomer}
            loading={loading}
          />
        )}

        {step === 2 && customer && (
          <SectionCard>
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

                <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bill type</label>
                    <select
                      value={billType}
                      onChange={(e) => setBillType(e.target.value)}
                      className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="For Material">For Material</option>
                      <option value="Cash Exchange">Cash Exchange</option>
                      <option value="Upload Bill Photo">Upload Bill Photo</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </SectionCard>
        )}
      </PageContainer>
    </ShopLayout>
  );
}
