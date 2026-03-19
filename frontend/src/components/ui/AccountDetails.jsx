import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeftIcon, ExclamationTriangleIcon, ShoppingCartIcon } from "@heroicons/react/24/outline";
import EditProductPopup from "./EditProductPopup";
import BackButton from "./BackButton";
import InlineError from "./InlineError";
import { useLanguage } from "../../context/LanguageContext";
import { authHeaders, API_BASE } from "../../api";


const CustomerAccount = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionId, setTransactionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTransaction, setExpandedTransaction] = useState(null); // <-- Added state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceTransactionId, setInvoiceTransactionId] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const headers = authHeaders();
        const [customerRes, transactionsRes] = await Promise.all([
          fetch(`${API_BASE}/api/customer/${customerId}`, { headers }),
          fetch(`${API_BASE}/api/transactions/${customerId}`, { headers }),
        ]);
        if (customerRes.status === 401 || transactionsRes.status === 401) {
          navigate("/login");
          return;
        }
        if (!customerRes.ok || !transactionsRes.ok) {
          throw new Error("Failed to fetch data");
        }
        const [customerData, transactionsData] = await Promise.all([
          customerRes.json(),
          transactionsRes.json(),
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
  }, [customerId, transactionId, navigate]);

  const handleEdit = (transaction) => {
    setSelectedTransaction(transaction);
    setShowEditModal(true);
  };

  // Assuming you are using React
  const handleFullyPaid = async (transaction) => {
    const updatedTransaction = {
      ...transaction,
      dueAmount: 0,
      paidAmount: transaction.grandTotal,
    };
    try {
      const res = await fetch(
        `${API_BASE}/api/transactions/${transaction.id}`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(updatedTransaction),
        }
      );
      if (res.status === 401) {
        navigate("/login");
        return;
      }
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

  const handleOpenInvoice = async (txn) => {
    setInvoiceTransactionId(txn.id);
    setShowInvoiceModal(true);
    setInvoiceData(null);
    setInvoiceLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/transactions/invoice/${txn.id}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setInvoiceData(data);
      }
    } catch {
      setInvoiceData(null);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleCloseInvoiceModal = () => {
    setShowInvoiceModal(false);
    setInvoiceTransactionId(null);
    setInvoiceData(null);
    setInvoiceError("");
  };

  const handlePrintInvoice = () => {
    if (!invoiceData?.transaction) return;
    const txn = invoiceData.transaction;
    const products = txn.products || [];
    const rows = products
      .map(
        (p, i) =>
          `<tr><td>${i + 1}</td><td>${p.productName || "-"}</td><td>${p.weight ?? "-"}</td><td>${p.rate != null ? Number(p.rate).toFixed(2) : "-"}</td><td>${p.total != null ? Number(p.total).toFixed(2) : "-"}</td></tr>`
      )
      .join("");
    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html><html><head><title>${t("customer.purchaseOrder")} #${txn.id}</title>
      <style>body{font-family:sans-serif;max-width:600px;margin:24px auto;padding:16px;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background:#f5f5f5;} .text-right{text-align:right;} .mt{ margin-top:16px;}</style>
      </head><body>
      <h2 style="text-align:center">${t("customer.purchaseOrder").toUpperCase()}</h2>
      ${invoiceData.storeName ? `<p>${invoiceData.storeName}</p>` : ""}
      <p><strong>${t("customer.customerLabel")}:</strong> ${txn.customerName}</p>
      <p><strong>${t("customer.date")}:</strong> ${txn.date ? new Date(txn.date).toLocaleString() : "-"}</p>
      <p><strong>${t("customer.orderNo")}:</strong> #${txn.id}</p>
      <table><thead><tr><th>${t("customer.tableNo")}</th><th>${t("customer.invoiceProduct")}</th><th>${t("customer.tableWeightQty")}</th><th>${t("customer.tableRate")}</th><th>${t("customer.tableAmount")}</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="mt"><strong>${t("customer.grandTotal")}:</strong> ₹${Number(txn.grandTotal || 0).toFixed(2)}</div>
      <div><strong>${t("customer.paidLabel")}:</strong> ₹${Number(txn.paidAmount || 0).toFixed(2)}</div>
      <div><strong>${t("customer.dueLabel")}:</strong> ₹${Number(txn.dueAmount || 0).toFixed(2)}</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
  };

  const handleDownloadInvoicePdf = async () => {
    if (!invoiceTransactionId) return;
    try {
      const res = await fetch(`${API_BASE}/api/transactions/invoice/${invoiceTransactionId}/pdf`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to download");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `purchase-order-${invoiceTransactionId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setInvoiceError("Failed to download PDF");
    }
  };

  const handleUpdateTransaction = async (updatedTransaction) => {
    try {
      const id = updatedTransaction.id ?? updatedTransaction._id;
      setTransactions((prev) =>
        prev.map((txn) => (txn.id === id || txn._id === id ? updatedTransaction : txn))
      );
      handleCloseModal();
      setTransactionId(id);
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const toggleTransaction = (txnId) => {
    setExpandedTransaction((prev) => (prev === txnId ? null : txnId));
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
      <div className="p-4 max-w-xl mx-auto">
        <InlineError message={error} />
        <div className="mt-4 flex justify-center">
          <BackButton to="/customerDashboard" label={t("customer.backToCustomers")} />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-4 text-center">
        {t("customer.customerNotFound")}
        <div className="mt-4 flex justify-center">
          <BackButton to="/customerDashboard" label={t("customer.backToCustomers")} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <BackButton to="/customerDashboard" label={t("customer.backToCustomers")} />
          <button
            type="button"
            onClick={() => navigate(`/shop?customerId=${customerId}`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
          >
            <ShoppingCartIcon className="h-5 w-5" />
            {t("customer.buy")}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{t("customer.customerDetails")}</h2>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              {isAtRisk && (
                <span className="inline-flex items-center bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  {t("customer.highRisk")}
                </span>
              )}
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <p><span className="font-medium text-gray-500">{t("customer.phone")}:</span> {customer.primary_phone}</p>
              {customer.secondary_phone && (
                <p><span className="font-medium text-gray-500">{t("customer.altPhone")}:</span> {customer.secondary_phone}</p>
              )}
              <p><span className="font-medium text-gray-500">{t("common.address")}:</span> {customer.address}</p>
              <p><span className="font-medium text-gray-500">{t("form.city")}:</span> {customer.city}, {customer.pincode}</p>
              <p><span className="font-medium text-gray-500">{t("form.country")}:</span> {customer.country}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{t("customer.accountSummary")}</h2>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t("customer.totalPurchases")}</span>
                <span className="font-medium text-gray-900">{transactions.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t("customer.totalAmount")}</span>
                <span className="font-medium text-gray-900">₹{(totalAmount ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t("customer.amountPaid")}</span>
                <span className="font-medium text-green-600">₹{(totalPaid ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t("customer.pendingAmount")}</span>
                <span className={`font-medium ${totalDue > 0 ? "text-red-600" : "text-gray-900"}`}>
                  ₹{(totalDue ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">{t("customer.transactionHistory")}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{t("customer.detailedViewPurchases")}</p>
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">{t("customer.noTransactionsYet")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("customer.tableNo")}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("customer.tableProducts")}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("customer.purchaseDate")}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("customer.tableAmount")}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("customer.tableStatus")}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("customer.tableActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((txn, txnIndex) => (
                    <React.Fragment key={txn.id}>
                      <tr
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => toggleTransaction(txn.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {txnIndex + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {txn.products?.[0]?.productName || t("customer.noProduct")}
                            </div>
                            <button
                              type="button"
                              className="text-xs text-blue-600 hover:underline"
                              onClick={(e) => { e.stopPropagation(); toggleTransaction(txn.id); }}
                            >
                              {t("customer.viewDetails")}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {new Date(txn.date).toLocaleDateString()}
                          <span className="block text-xs text-gray-500">
                            {new Date(txn.date).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ₹{(txn.grandTotal ?? 0).toFixed(2)}
                          </div>
                          <div className={`text-xs ${txn.dueAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                            {txn.dueAmount > 0 ? `₹${(txn.dueAmount ?? 0).toFixed(2)} ${t("customer.due")}` : t("customer.fullyPaid")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            txn.dueAmount > 0 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                          }`}>
                            {txn.dueAmount > 0 ? t("customer.pending") : t("customer.completed")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenInvoice(txn)}
                              className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60"
                            >
                              {t("customer.invoice")}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEdit(txn)}
                              className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
                            >
                              {t("customer.edit")}
                            </button>
                            {txn.dueAmount > 0 && (
                              <button
                                type="button"
                                onClick={() => handleFullyPaid(txn)}
                                className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                              >
                                {t("customer.fullyPay")}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {expandedTransaction === txn.id && (
                        <tr className="bg-gray-50">
                          <td colSpan="6" className="px-6 py-4">
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

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleCloseInvoiceModal}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{t("customer.purchaseOrder")}</h3>
              <button type="button" onClick={handleCloseInvoiceModal} className="text-gray-500 hover:text-gray-700 p-1">×</button>
            </div>
            {invoiceError && (
              <div className="px-6 pt-2">
                <InlineError message={invoiceError} onDismiss={() => setInvoiceError("")} />
              </div>
            )}
            <div className="p-6 overflow-y-auto flex-1">
              {invoiceLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
                </div>
              ) : invoiceData?.transaction ? (
                <div className="space-y-4">
                  {invoiceData.storeName && <p className="text-sm text-gray-600">{invoiceData.storeName}</p>}
                  <p className="text-sm"><span className="font-medium text-gray-500">{t("customer.customerLabel")}:</span> {invoiceData.transaction.customerName}</p>
                  <p className="text-sm"><span className="font-medium text-gray-500">{t("customer.date")}:</span> {invoiceData.transaction.date ? new Date(invoiceData.transaction.date).toLocaleString() : "-"}</p>
                  <p className="text-sm"><span className="font-medium text-gray-500">{t("customer.orderNo")}</span> #{invoiceData.transaction.id}</p>
                  <table className="min-w-full text-sm border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left border-b">{t("customer.tableNo")}</th>
                        <th className="px-3 py-2 text-left border-b">{t("customer.invoiceProduct")}</th>
                        <th className="px-3 py-2 text-left border-b">{t("customer.tableWeight")}</th>
                        <th className="px-3 py-2 text-right border-b">{t("customer.tableRate")}</th>
                        <th className="px-3 py-2 text-right border-b">{t("customer.tableAmount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(invoiceData.transaction.products || []).map((p, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="px-3 py-2">{i + 1}</td>
                          <td className="px-3 py-2">{p.productName || "-"}</td>
                          <td className="px-3 py-2">{p.weight ?? "-"}</td>
                          <td className="px-3 py-2 text-right">{p.rate != null ? `₹${Number(p.rate).toFixed(2)}` : "-"}</td>
                          <td className="px-3 py-2 text-right">{p.total != null ? `₹${Number(p.total).toFixed(2)}` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="pt-2 space-y-1 text-sm">
                    <p className="flex justify-between"><span className="font-medium text-gray-600">{t("customer.grandTotal")}</span> <span>₹{Number(invoiceData.transaction.grandTotal || 0).toFixed(2)}</span></p>
                    <p className="flex justify-between"><span className="font-medium text-gray-600">{t("customer.paidAmount")}</span> <span className="text-green-600">₹{Number(invoiceData.transaction.paidAmount || 0).toFixed(2)}</span></p>
                    <p className="flex justify-between"><span className="font-medium text-gray-600">{t("customer.dueAmount")}</span> <span>₹{Number(invoiceData.transaction.dueAmount || 0).toFixed(2)}</span></p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">{t("customer.couldNotLoadInvoice")}</p>
              )}
            </div>
            {invoiceData?.transaction && (
              <div className="px-6 py-4 border-t border-gray-200 flex gap-2">
                <button type="button" onClick={handlePrintInvoice} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">{t("customer.print")}</button>
                <button type="button" onClick={handleDownloadInvoicePdf} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">{t("customer.downloadPdf")}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerAccount;
