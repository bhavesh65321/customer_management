import React, { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

const BuyProduct = ({ customer, isOpen, onClose }) => {

  const initialProduct = {
    productName: "",
    metalType: "gold",
    weight: "",
    rate: "",
    makingCharge: "",
    diamondCharge: "",
    gstPercent: "3",
  };

  const [products, setProducts] = useState([{...initialProduct}]);
  const [paidAmount, setPaidAmount] = useState("");
  const [customerId, setCustomerId] = useState("");

  useEffect(() => {
    if (customer?.id) {
      setCustomerId(customer.id);
    }
  }, [customer]);

  const parseNumber = (value) => parseFloat(value) || 0;

  const calculateTotals = () => {
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
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setProducts(newProducts);
  };

  const addProduct = () => setProducts([...products, {...initialProduct}]);
  
  const removeProduct = (index) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = () => {
    const transactionData = {
      customerId,
      customerName: customer.name,
      products: calculatedProducts,
      paidAmount: parseNumber(paidAmount),
      dueAmount: Math.max(dueAmount, 0),
      grandTotal,
      date: new Date().toISOString(),
    };
    console.log(transactionData);
    console.log(JSON.stringify(transactionData))

    fetch("http://localhost:5000/api/transactions/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transactionData),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save transaction");
        return res.json();
      })
      .then((data) => {
        alert("Transaction saved successfully!");
        onClose();
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to save transaction");
      });
  };

  const getWeightUnit = (metalType) => {
    return metalType === "silver" ? "kg" : 
           metalType === "diamond" ? "pieces" : "g";
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
                    New Purchase for {customer.name}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-700">Products</h4>
                      <button onClick={addProduct} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
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
                          {/* Product Fields */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Product Name
                            </label>
                            <input
                              type="text"
                              value={product.productName}
                              onChange={(e) => handleProductChange(index, "productName", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="e.g., Gold Chain"
                            />
                          </div>

                          <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={`metalType-${index}`}>
                            Metal Type
                          </label>
                          <select
                            id={`metalType-${index}`}
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
                          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={`weight-${index}`}>
                            Weight ({getWeightUnit(product.metalType)})
                          </label>
                          <input
                            id={`weight-${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={product.weight}
                            onChange={(e) => handleProductChange(index, "weight", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder={product.metalType === "silver" ? "e.g., 0.5" : "e.g., 10"}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={`rate-${index}`}>
                            Rate (भाव)
                          </label>
                          <input
                            id={`rate-${index}`}
                            type="number"
                            min="0"
                            step="1"
                            value={product.rate}
                            onChange={(e) => handleProductChange(index, "rate", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., 5000"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={`makingCharge-${index}`}>
                            Making Charge (₹)
                          </label>
                          <input
                            id={`makingCharge-${index}`}
                            type="number"
                            min="0"
                            step="1"
                            value={product.makingCharge}
                            onChange={(e) => handleProductChange(index, "makingCharge", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., 1500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={`diamondCharge-${index}`}>
                            Diamond/Stone Charge (₹)
                          </label>
                          <input
                            id={`diamondCharge-${index}`}
                            type="number"
                            min="0"
                            step="1"
                            value={product.diamondCharge}
                            onChange={(e) => handleProductChange(index, "diamondCharge", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., 2000"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={`gstPercent-${index}`}>
                            GST (%)
                          </label>
                          <select
                            id={`gstPercent-${index}`}
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

                        <div className="md:col-span-2 bg-gray-50 p-3 rounded-md">
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="font-medium">Metal Value:</div>
                            <div className="col-span-2 text-right">
                              ₹{calculatedProducts[index]?.metalValue.toFixed(2) || "0.00"}
                            </div>

                            <div className="font-medium">Making Charge:</div>
                            <div className="col-span-2 text-right">
                              ₹{parseNumber(product.makingCharge).toFixed(2)}
                            </div>

                            <div className="font-medium">Diamond Charge:</div>
                            <div className="col-span-2 text-right">
                              ₹{parseNumber(product.diamondCharge).toFixed(2)}
                            </div>

                            <div className="font-medium">GST ({product.gstPercent}%):</div>
                            <div className="col-span-2 text-right">
                              ₹{calculatedProducts[index]?.gstAmount.toFixed(2) || "0.00"}
                            </div>

                            <div className="font-medium text-blue-600">Total:</div>
                            <div className="col-span-2 text-right font-medium text-blue-600">
                              ₹{calculatedProducts[index]?.total.toFixed(2) || "0.00"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="paidAmount">
                        Paid Amount (₹)
                      </label>
                      <input
                        id="paidAmount"
                        type="number"
                        min="0"
                        step="1"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}

                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
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
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Save Transaction
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default BuyProduct;
