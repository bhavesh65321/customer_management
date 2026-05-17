import React, { useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { authHeaders, API_BASE } from "../../api";
import InlineError from "./InlineError";
import { parseApiError } from "../../utils/apiError";

const EditProductPopup = ({ productData, isOpen, onClose, onUpdate }) => {
  // Initialize state with proper fallbacks
  const [products, setProducts] = useState(() => {
    if (productData?.products && Array.isArray(productData.products)) {
      return productData.products.map((p) => ({ ...p, _uid: p._uid || `${p.id ?? ""}-${Math.random()}` }));
    }
    return [{
      _uid: `new-${Math.random()}`,
      productName: "",
      metalType: "gold",
      weight: 0,
      rate: 0,
      makingCharge: 0,
      diamondCharge: 0,
      gstPercent: 3,
    }];
  });

  
  const [paidAmount, setPaidAmount] = useState(productData.paidAmount || "");
  // customer kept for potential future use (e.g. customer.gstin on invoice)
  // eslint-disable-next-line no-unused-vars
  const [customer] = useState(productData.customer || {});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paidAmountError, setPaidAmountError] = useState(null);

  const parseNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const calculateTotals = () => {
    if (!Array.isArray(products)) return [];
    return products.map(product => {
      const weight = parseNumber(product.weight);
      const rate = parseNumber(product.rate);
      const makingCharge = parseNumber(product.makingCharge);
      const diamondCharge = parseNumber(product.diamondCharge);
      const gstPercent = parseNumber(product.gstPercent);

      const metalValue = weight * rate;
      const taxableAmount = metalValue + makingCharge;
      const gstAmount = (taxableAmount * gstPercent) / 100;
      const total = metalValue + makingCharge + diamondCharge + gstAmount;

      return { ...product, metalValue, gstAmount, total };
    });
  };

  const calculatedProducts = calculateTotals();
  const grandTotal = calculatedProducts.reduce((sum, p) => sum + p.total, 0);
  const dueAmount = grandTotal - parseNumber(paidAmount);

  const handleProductChange = (index, field, value) => {
    setProducts(prev => {
      const newProducts = [...prev];
      newProducts[index] = {
        ...newProducts[index],
        [field]: field === 'productName' ? value : parseNumber(value)
      };
      return newProducts;
    });
  };

  const addProduct = () => {
    setProducts(prev => [...prev, {
      _uid: `new-${Math.random()}`,
      productName: "",
      metalType: "gold",
      weight: 0,
      rate: 0,
      makingCharge: 0,
      diamondCharge: 0,
      gstPercent: 3,
    }]);
  };

  const removeProduct = (index) => {
    if (products.length > 1) {
      setProducts(prev => prev.filter((_, i) => i !== index));
    }
  };
  

  const handleSubmit = async () => {
    setError(null);
    
    // Validate required fields
    if (products.some(p => !p.productName)) {
      setError("Product name is required for all items");
      return;
     }

    setIsLoading(true);
    const transactionData = {
      id: productData.id,
      customerId: productData.customerId,
      customerName: productData.customerName,
      products: calculatedProducts,
      paidAmount: parseNumber(paidAmount),
      dueAmount: Math.max(dueAmount, 0),
      grandTotal,
      date: productData.date || new Date().toISOString(),
    };

    try {
      const response = await fetch(`${API_BASE}/api/transactions/${productData.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(transactionData),
      });


      if (!response.ok) {
        const d = await response.json().catch(() => ({}));
        setError(parseApiError(d, "Failed to update transaction. Please try again."));
        return;
      }
      const updatedTransaction = await response.json();

      if (onUpdate) {
        onUpdate(updatedTransaction);
      }
      onClose();

    } catch (err) {
      console.error("Update error:", err);
      setError(err.message || "Failed to update transaction. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };


  const getWeightUnit = (metalType) => {
    return metalType === "silver" ? "kg" : 
           metalType === "diamond" ? "pieces" : "g";
  };

  const handlePaidAmountChange = (value) => {
    const numValue = parseNumber(value);
    const maxAllowed = grandTotal;
    
    if (numValue > maxAllowed) {
      setPaidAmountError(`Maximum allowed: ₹${maxAllowed.toFixed(2)}`);
      return; // Don't update the value at all
    }
    
    setPaidAmountError(null);
    setPaidAmount(value);
  };

  const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";
  const labelCls = "block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5";

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Edit Purchase</p>
                    <Dialog.Title as="h3" className="text-xl font-bold text-gray-900">
                      {productData.customerName}
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  {error && (
                    <InlineError message={error} onDismiss={() => setError(null)} />
                  )}

                  {/* Products */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Products</span>
                    <button
                      onClick={addProduct}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      + Add Item
                    </button>
                  </div>

                  {products.map((product, index) => (
                    <div key={product._uid || product.id || index} className="border border-gray-100 rounded-2xl bg-gray-50/50 overflow-hidden">
                      {/* Product card header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                          Item {index + 1}
                        </span>
                        {products.length > 1 && (
                          <button
                            onClick={() => removeProduct(index)}
                            className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className={labelCls}>Product Name</label>
                          <input
                            type="text"
                            value={product.productName}
                            onChange={(e) => handleProductChange(index, "productName", e.target.value)}
                            placeholder="e.g. Gold Necklace 22K"
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Metal Type</label>
                          <select
                            value={product.metalType}
                            onChange={(e) => handleProductChange(index, "metalType", e.target.value)}
                            className={inputCls}
                          >
                            <option value="gold">Gold (per gram)</option>
                            <option value="silver">Silver (per kg)</option>
                            <option value="platinum">Platinum (per gram)</option>
                            <option value="diamond">Diamond (per piece)</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className={labelCls}>GST Rate</label>
                          <select
                            value={product.gstPercent}
                            onChange={(e) => handleProductChange(index, "gstPercent", e.target.value)}
                            className={inputCls}
                          >
                            <option value="1.5">1.5% — Gold</option>
                            <option value="3">3% — Jewellery</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="0">Nil / Not Applicable</option>
                          </select>
                        </div>

                        <div>
                          <label className={labelCls}>Weight ({getWeightUnit(product.metalType)})</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={product.weight}
                            onChange={(e) => handleProductChange(index, "weight", e.target.value)}
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Rate / {getWeightUnit(product.metalType)} (भाव)</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={product.rate}
                            onChange={(e) => handleProductChange(index, "rate", e.target.value)}
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Making Charge (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={product.makingCharge}
                            onChange={(e) => handleProductChange(index, "makingCharge", e.target.value)}
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Diamond / Stone Charge (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={product.diamondCharge}
                            onChange={(e) => handleProductChange(index, "diamondCharge", e.target.value)}
                            className={inputCls}
                          />
                        </div>

                        {/* Calculated breakdown */}
                        <div className="md:col-span-2 border-t border-gray-100 pt-3 mt-1">
                          <div className="flex flex-col gap-1.5 text-sm">
                            {[
                              ["Metal Value", calculatedProducts[index]?.metalValue],
                              ["Making Charge", calculatedProducts[index]?.makingCharge],
                              ["Diamond / Stone", calculatedProducts[index]?.diamondCharge],
                              [`GST (${product.gstPercent}%)`, calculatedProducts[index]?.gstAmount],
                            ].map(([label, val]) => (
                              <div key={label} className="flex items-center justify-between text-gray-500">
                                <span>{label}</span>
                                <span className="font-medium text-gray-700">₹{(val || 0).toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 font-bold text-blue-600">
                              <span>Item Total</span>
                              <span>₹{(calculatedProducts[index]?.total || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment summary strip */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Payment Summary</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Grand Total</p>
                      <p className="text-xl font-bold text-gray-900">₹{grandTotal.toFixed(2)}</p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Paid Amount</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={paidAmount}
                        onChange={(e) => handlePaidAmountChange(e.target.value)}
                        className="w-full text-lg font-bold text-green-600 bg-transparent focus:outline-none border-b border-gray-200 focus:border-green-400 pb-0.5"
                        placeholder="0"
                      />
                      {paidAmountError && (
                        <p className="mt-1 text-xs text-red-500">{paidAmountError}</p>
                      )}
                    </div>

                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Due Amount</p>
                      <p className={`text-xl font-bold ${Math.max(dueAmount, 0) > 0 ? "text-red-500" : "text-green-600"}`}>
                        ₹{Math.max(dueAmount, 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? "Updating..." : "Update Transaction"}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default EditProductPopup;