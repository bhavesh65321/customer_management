import React, { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

const EditProductPopup = ({ productData, isOpen, onClose, onUpdate }) => {
  // Initialize state with proper fallbacks
  const [products, setProducts] = useState(() => {
    if (productData?.products && Array.isArray(productData.products)) {
      return [...productData.products];
    }
    return [{
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
  const [customer] = useState(productData.customer || {});
  const [customerId, setCustomerId] = useState(productData.customerId || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paidAmountError, setPaidAmountError] = useState(null);

  useEffect(() => {
    if (customer?.id) {
      setCustomerId(customer.id);
    }
  }, [customer]);

  const parseNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const calculateTotals = () => {
    if (!Array.isArray(products)) return [];
    return products.map(product => {
      const productName = product.productName;
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

    console.log(transactionData);

    try {
      const response = await fetch(`http://localhost:5000/api/transactions/${productData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(transactionData),
      });


      if (!response.ok) {
        throw new Error(response.statusText || "Failed to update transaction");
      }
      
      const updatedTransaction = await response.json();

      if (onUpdate) {
        onUpdate(updatedTransaction);
      }

      alert("Transaction updated successfully!");
      onClose();

    } catch (error) {
      console.error("Update error:", error);
      setError(error.message || "Error updating transaction");
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
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Edit Purchase for {productData.customerName}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-700">Products</h4>
                      <button 
                        onClick={addProduct} 
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        + Add Product
                      </button>
                    </div>

                    {products.map((product, index) => (
                      <div key={index} className="mb-6 p-4 border border-gray-200 rounded-lg relative">
                        {products.length > 1 && (
                          <button
                            onClick={() => removeProduct(index)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Product Name
                            </label>
                            <input
                              type="text"
                              value={product.productName}
                              onChange={(e) => handleProductChange(index, "productName", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Metal Type
                            </label>
                            <select
                              value={product.metalType}
                              onChange={(e) => handleProductChange(index, "metalType", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Rate (भाव)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={product.rate}
                              onChange={(e) => handleProductChange(index, "rate", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Making Charge (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={product.makingCharge}
                              onChange={(e) => handleProductChange(index, "makingCharge", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Diamond/Stone Charge (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={product.diamondCharge}
                              onChange={(e) => handleProductChange(index, "diamondCharge", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              GST (%)
                            </label>
                            <select
                              value={product.gstPercent}
                              onChange={(e) => handleProductChange(index, "gstPercent", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="1.5">1.5% (Gold)</option>
                              <option value="3">3% (Jewelry)</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="0">Not Applicable</option>
                            </select>
                          </div>
                        </div>

                        <div className="md:col-span-2 bg-gray-50 p-3 rounded-md mt-4">
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="font-medium">Metal Value:</div>
                            <div className="col-span-2 text-right">
                              ₹{calculatedProducts[index]?.metalValue.toFixed(2)}
                            </div>

                            <div className="font-medium">Making Charge:</div>
                            <div className="col-span-2 text-right">
                              ₹{calculatedProducts[index]?.makingCharge.toFixed(2)}
                            </div>

                            <div className="font-medium">Diamond Charge:</div>
                            <div className="col-span-2 text-right">
                              ₹{calculatedProducts[index]?.diamondCharge.toFixed(2)}
                            </div>

                            <div className="font-medium">GST ({product.gstPercent}%):</div>
                            <div className="col-span-2 text-right">
                              ₹{calculatedProducts[index]?.gstAmount.toFixed(2)}
                            </div>

                            <div className="font-medium text-blue-600">Total:</div>
                            <div className="col-span-2 text-right font-medium text-blue-600">
                              ₹{calculatedProducts[index]?.total.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mt-6">
                  <h4 className="font-medium text-gray-700 mb-3">Payment Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grand Total (₹)
                      </label>
                      <div className="text-xl font-bold text-gray-900">
                        ₹{grandTotal.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Paid Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={paidAmount}
                        onChange={(e) => handlePaidAmountChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {paidAmountError && (
      <p className="mt-1 text-sm text-red-600">{paidAmountError}</p>
    )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Due Amount (₹)
                      </label>
                      <div className={`text-xl font-bold ${dueAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                        ₹{Math.max(dueAmount, 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className={`px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 ${isLoading ? 'cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? 'Updating...' : 'Update Transaction'}
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