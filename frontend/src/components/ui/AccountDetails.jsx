import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import EditProductPopup from './EditProductPopup';


const CustomerAccount = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionId, setTransactionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTransaction, setExpandedTransaction] = useState(null); // <-- Added state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [customerRes, transactionsRes] = await Promise.all([
          fetch(`http://localhost:5000/api/customer/${customerId}`),
          fetch(`http://localhost:5000/api/transactions/${customerId}`)
        ]);

        if (!customerRes.ok || !transactionsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [customerData, transactionsData] = await Promise.all([
          customerRes.json(),
          transactionsRes.json()
        ]);

        setCustomer(customerData);
        setTransactions(transactionsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, transactionId]);

  const handleEdit = (transaction) => {
    setSelectedTransaction(transaction);
    setShowEditModal(true);
  };

  // Assuming you are using React
  const handleFullyPaid = async (transaction) => {
    debugger;
    console.log(transaction);
    const updatedTransaction = {
      ...transaction,
      dueAmount: 0, 
    paidAmount: transaction.grandTotal, 
    };
  
    try {
      debugger;
      const res = await fetch(`http://localhost:8000/api/transactions/${transaction.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedTransaction),
      });
  
      if (!res.ok) {
        throw new Error("Failed to update transaction");
      }
  
      const data = await res.json();
      handleUpdateTransaction(data);
      setTransactionId(transaction.id); // Update your frontend state/UI
    } catch (error) {
      console.error("Error marking as fully paid:", error);
    }
  };
  

  

  const handleCloseModal = () => {
    setShowEditModal(false);
    setSelectedTransaction(null);
  };

  const handleUpdateTransaction = async (updatedTransaction) => {
  try {
    // Update local transactions state
    setTransactions(prev => 
      prev.map(txn => txn._id === updatedTransaction._id ? updatedTransaction : txn)
    );
  
    // setTimeout(() => window.location.reload(), 100);
    handleCloseModal();
    setTransactionId(updatedTransaction.id);
    
    
  } catch (error) {
    console.error("Update failed:", error);
  
  }
};

  const toggleTransaction = (txnId) => {
    debugger;
      console.log(txnId)
      setExpandedTransaction(expandedTransaction === txnId ? null : txnId);

  };


  const totalAmount = transactions.reduce((sum, txn) => sum + (txn.grandTotal || 0), 0);
  const totalPaid = transactions.reduce((sum, txn) => sum + (txn.paidAmount || 0), 0);
  const totalDue = transactions.reduce((sum, txn) => sum + (txn.dueAmount || 0), 0);
  const isAtRisk = totalDue > (totalAmount * 0.5);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error: {error}
        <button 
          onClick={() => navigate(-1)}
          className="mt-4 flex items-center justify-center text-blue-600"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Customers
        </button>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-4 text-center">
        Customer not found
        <button 
          onClick={() => navigate(-1)}
          className="mt-4 flex items-center justify-center text-blue-600"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Customers
        </button>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              {customer.name}
              {isAtRisk && (
                <span className="ml-3 flex items-center bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  High Risk
                </span>
              )}
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-700">Contact Information</h2>
              <div className="space-y-2">
                <p><span className="font-medium">Phone:</span> {customer.primary_phone}</p>
                {customer.secondary_phone && (
                  <p><span className="font-medium">Alt. Phone:</span> {customer.secondary_phone}</p>
                )}
                <p><span className="font-medium">Address:</span> {customer.address}</p>
                <p><span className="font-medium">City:</span> {customer.city}, {customer.pincode}</p>
                <p><span className="font-medium">Country:</span> {customer.country}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-3 text-gray-700">Account Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Purchase:</span>
                  <span className="font-medium">{transactions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-medium">₹{(totalAmount ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span className="font-medium text-green-600">₹{(totalPaid ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Amount:</span>
                  <span className={`font-medium ${totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{(totalDue ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-8">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800">Transaction History</h2>
            <p className="text-sm text-gray-500 mt-1">Detailed view of all purchases</p>
          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto h-16 w-16 text-gray-300 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No transactions found</h3>
              <p className="text-gray-500">This customer hasn't made any purchases yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((txn, txnIndex) => (
                    <React.Fragment key={txn.id}>
                      <tr 
                        className="hover:bg-gray-50 transition-colors cursor-pointer" 
                        onClick={() => toggleTransaction(txn.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {txnIndex + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                              {txn.products[0]?.productName || 'No Product'}
                              </div>
                              <div className="text-xs text-blue-500 underline">
                                View details
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(txn.date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(txn.date).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ₹{(txn.grandTotal ?? 0).toFixed(2)}
                          </div>
                          <div className={`text-xs ${txn.dueAmount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {txn.dueAmount > 0 ? 
                              `₹${(txn.dueAmount ?? 0).toFixed(2)} due` : 
                              'Fully paid'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            txn.dueAmount > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {txn.dueAmount > 0 ? 'Pending' : 'Completed'}
                          </span>
                        </td>
                        <td className="flex space-x-2 px-4 py-6">
                        <button
                      onClick={() => handleEdit(txn)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${ 'bg-slate-500 text-white'
                      }`}
                    >
                      Edit
                    </button>
                    {txn.dueAmount > 0 && (<button className={`px-2.5 py-1 rounded-full text-xs font-medium ${ 'bg-blue-600 text-white'
                      }`}
                       onClick={() => handleFullyPaid(txn)}>fullyPay</button>)}

                          </td>
                      </tr>

                      {expandedTransaction === txn.id && (
                        <tr className="bg-gray-50">
                          <td colSpan="5" className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {txn.products.map((product, productIndex) => (
                                <div key={productIndex} className="bg-white p-4 rounded-lg shadow-xs border border-gray-100">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-medium text-gray-800">
                                        {productIndex + 1}. {product.productName}
                                      </h4>
                                      <p className="text-sm text-gray-500 capitalize">
                                        {product.metalType} ({product.weight}g)
                                      </p>
                                    </div>
                                    <span className="text-sm font-medium text-blue-600">
                                      ₹{product.total.toFixed(2)}
                                    </span>
                                  </div>

                                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-gray-500">Rate:</span>
                                      <span className="ml-2">₹{product.rate.toFixed(2)}/g</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Making:</span>
                                      <span className="ml-2">₹{product.makingCharge.toFixed(2)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Diamond:</span>
                                      <span className="ml-2">₹{product.diamondCharge.toFixed(2)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">GST ({product.gstPercent}%):</span>
                                      <span className="ml-2">₹{product.gstAmount.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
       {/* Edit Modal */}
     {showEditModal && selectedTransaction && (
      <EditProductPopup
      productData={selectedTransaction}
      isOpen={showEditModal}
      onUpdate={handleUpdateTransaction}
      onClose={handleCloseModal}
      />
    )}
    </div>
  );
};

export default CustomerAccount;
