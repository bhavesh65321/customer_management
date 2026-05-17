import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ExclamationTriangleIcon, ShoppingCartIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import EditProductPopup from "./EditProductPopup";
import BackButton from "./BackButton";
import { parseApiError } from "../../utils/apiError";
import InlineError from "./InlineError";
import AddCustomerDrawer from "./AddCustomer";
import CollectPaymentModal from "./CollectPaymentModal";
import InvoicePreviewModal from "./InvoicePreviewModal";
import { useLanguage } from "../../context/LanguageContext";
import { authHeaders, API_BASE } from "../../api";
import { formatDate, formatRupee } from "../../utils/format";
import { Spinner } from "./Spinner";

const METAL_TYPE_LABELS = {
  raw_to_pure: "Raw → Pure",
  raw_to_cash: "Raw → Cash",
  advance_metal: "Advance (metal)",
  advance_money: "Advance (money)",
};

const CustomerAccount = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [girviLoans, setGirviLoans] = useState([]);
  const [orders, setOrders] = useState([]);
  const [metalExchanges, setMetalExchanges] = useState([]);
  const [advanceBalanceRow, setAdvanceBalanceRow] = useState(null);
  const [sectionFilter, setSectionFilter] = useState("purchases");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTransaction, setExpandedTransaction] = useState(null);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceTransactionId, setInvoiceTransactionId] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [collectTx, setCollectTx] = useState(null);
  const [collectLoading, setCollectLoading] = useState(false);
  const [collectError, setCollectError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const headers = authHeaders();
        const [customerRes, transactionsRes, girviRes, ordersRes, metalRes, advanceRes] = await Promise.all([
          fetch(`${API_BASE}/api/customer/${customerId}`, { headers }),
          fetch(`${API_BASE}/api/transactions/${customerId}`, { headers }),
          fetch(`${API_BASE}/api/girvi?customer_id=${customerId}`, { headers }),
          fetch(`${API_BASE}/api/orders?customer_id=${customerId}`, { headers }),
          fetch(`${API_BASE}/api/metal-exchange?customer_id=${customerId}`, { headers }),
          fetch(`${API_BASE}/api/metal-exchange/advance-balance?customer_id=${customerId}`, { headers }),
        ]);
        if (
          customerRes.status === 401 ||
          transactionsRes.status === 401 ||
          girviRes.status === 401 ||
          ordersRes.status === 401 ||
          metalRes.status === 401 ||
          advanceRes.status === 401
        ) {
          navigate("/login");
          return;
        }
        if (!customerRes.ok || !transactionsRes.ok) {
          const errData = await (customerRes.ok ? transactionsRes : customerRes).json().catch(() => ({}));
          throw new Error(parseApiError(errData, "Failed to load customer data. Please try again."));
        }
        const [customerData, transactionsData] = await Promise.all([
          customerRes.json(),
          transactionsRes.json(),
        ]);
        setCustomer(customerData);
        setTransactions(transactionsData);
        const girviData = girviRes.ok ? await girviRes.json() : [];
        const ordersData = ordersRes.ok ? await ordersRes.json() : [];
        setGirviLoans(Array.isArray(girviData) ? girviData : []);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        const metalData = metalRes.ok ? await metalRes.json() : [];
        setMetalExchanges(Array.isArray(metalData) ? metalData : []);
        if (advanceRes.ok) {
          const advArr = await advanceRes.json();
          setAdvanceBalanceRow(Array.isArray(advArr) && advArr.length > 0 ? advArr[0] : null);
        } else {
          setAdvanceBalanceRow(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [customerId, navigate]);

  const ordersNew = (orders || []).filter((o) => o.type === "new_order");
  const ordersRepair = (orders || []).filter((o) => o.type === "repair");
  const metalAdvanceRows = (metalExchanges || []).filter((r) => r.type === "advance_metal" || r.type === "advance_money");
  const metalTradeRows = (metalExchanges || []).filter((r) => r.type === "raw_to_pure" || r.type === "raw_to_cash");

  const handleEdit = (transaction) => {
    setSelectedTransaction(transaction);
    setShowEditModal(true);
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

  // Bug 8 fixed: surgically update local state, don't silently swallow errors
  const handleUpdateTransaction = (updatedTransaction) => {
    const id = updatedTransaction.id ?? updatedTransaction._id;
    setTransactions((prev) =>
      prev.map((txn) => (txn.id === id || txn._id === id ? { ...txn, ...updatedTransaction } : txn))
    );
    handleCloseModal();
  };

  const toggleTransaction = (txnId) => {
    setExpandedTransaction((prev) => (prev === txnId ? null : txnId));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" center />
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

  // ── derived values ──────────────────────────────────────────────
  const totalAmount = transactions.reduce((s, t) => s + (t.grandTotal || 0), 0);
  const totalPaid   = transactions.reduce((s, t) => s + (t.paidAmount || 0), 0);
  const totalDue    = transactions.reduce((s, t) => s + (t.dueAmount || 0), 0);
  const isAtRisk    = totalDue > totalAmount * 0.5;
  const payPct      = totalAmount > 0 ? Math.min(100, (totalPaid / totalAmount) * 100) : 0;
  const pendingTxns = transactions.filter((t) => (t.dueAmount || 0) > 0);
  const initials    = (customer.name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const inrFmt      = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  const TABS = [
    { key: "purchases",    label: t("customer.filterPurchases"),    count: transactions.length },
    { key: "girvi",        label: t("customer.filterGirvi"),        count: girviLoans.length },
    { key: "orders",       label: t("customer.filterOrders"),       count: ordersNew.length },
    { key: "repairs",      label: t("customer.filterRepairs"),      count: ordersRepair.length },
    { key: "metalAdvance", label: t("customer.metalAdvanceTab"),    count: metalAdvanceRows.length },
    { key: "metalExchange",label: t("customer.metalExchangeTab"),   count: metalTradeRows.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ── Top nav bar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <BackButton to="/customerDashboard" label={t("customer.backToCustomers")} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEditCustomer(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <PencilSquareIcon className="h-4 w-4" />
              {t("customer.editCustomer") || "Edit Customer"}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/shop?customerId=${customerId}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <ShoppingCartIcon className="h-4 w-4" />
              {t("customer.buy")}
            </button>
          </div>
        </div>

        {/* ── Hero 2-col card ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Customer identity card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-sm">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">{customer.name}</h1>
                  {isAtRisk && (
                    <span
                      title="High outstanding due relative to total purchases"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 cursor-help"
                    >
                      <ExclamationTriangleIcon className="h-3 w-3" />
                      {t("customer.highRisk")}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 space-y-1">
                  {customer.primary_phone && (
                    <p className="text-sm text-gray-600">📞 {customer.primary_phone}</p>
                  )}
                  {customer.secondary_phone && (
                    <p className="text-sm text-gray-500">📞 {customer.secondary_phone} <span className="text-gray-400 text-xs">(alt)</span></p>
                  )}
                  {customer.address && (
                    <p className="text-sm text-gray-500 truncate">📍 {[customer.address, customer.city, customer.country].filter(Boolean).join(", ")}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment health card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Payment Health</p>
              <span className="text-xs text-gray-400">{transactions.length} transactions</span>
            </div>

            {/* Progress bar */}
            <div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${payPct >= 100 ? "bg-green-500" : payPct >= 60 ? "bg-amber-400" : "bg-red-500"}`}
                  style={{ width: `${payPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>{payPct.toFixed(0)}% collected</span>
                <span>of {inrFmt(totalAmount)}</span>
              </div>
            </div>

            {/* 3-stat grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
              <div className="text-center">
                <p className="text-[11px] text-gray-400 mb-0.5">Billed</p>
                <p className="text-sm font-bold text-gray-800">{inrFmt(totalAmount)}</p>
              </div>
              <div className="text-center border-x border-gray-100">
                <p className="text-[11px] text-gray-400 mb-0.5">Collected</p>
                <p className="text-sm font-bold text-green-600">{inrFmt(totalPaid)}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-gray-400 mb-0.5">Pending</p>
                <p className="text-sm font-bold text-red-500">{inrFmt(totalDue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Pending dues alert ───────────────────────────────────── */}
        {pendingTxns.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-amber-500 text-lg flex-shrink-0">⏰</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                {pendingTxns.length} unpaid transaction{pendingTxns.length > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-amber-600">Total pending: {inrFmt(totalDue)}</p>
            </div>
            <button
              type="button"
              onClick={() => { setCollectTx(pendingTxns[0]); setCollectError(""); }}
              className="flex-shrink-0 px-4 py-2 text-xs font-bold bg-white border border-amber-400 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
            >
              Collect →
            </button>
          </div>
        )}

        {/* ── Tab section ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

          {/* Tab bar */}
          <div className="flex overflow-x-auto border-b border-gray-100 scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSectionFilter(tab.key)}
                className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium whitespace-nowrap flex-shrink-0 border-b-2 transition-all ${
                  sectionFilter === tab.key
                    ? "border-blue-600 text-blue-600 bg-blue-50/40"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                    sectionFilter === tab.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Purchases tab ─────────────────────────────── */}
          {sectionFilter === "purchases" && (
            <div className="p-4 space-y-3">
              {transactions.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-5xl mb-3">🛍️</div>
                  <p className="text-gray-500 font-semibold">{t("customer.noTransactionsYet")}</p>
                  <p className="text-gray-400 text-sm mt-1">Click "Create Bill" to record the first transaction</p>
                </div>
              ) : (
                [...transactions]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((txn, idx) => {
                    const due     = txn.dueAmount || 0;
                    const paid    = txn.paidAmount || 0;
                    const total   = txn.grandTotal || 0;
                    const isOpen  = expandedTransaction === txn.id;
                    const isPaid  = due <= 0;
                    const isPartial = paid > 0 && due > 0;

                    return (
                      <div
                        key={txn.id}
                        className={`rounded-xl border-2 transition-all ${
                          isPaid ? "border-gray-100" : isPartial ? "border-amber-100" : "border-red-100"
                        }`}
                      >
                        {/* Card main row */}
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Index badge */}
                            <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                              {transactions.length - idx}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">
                                  {txn.products?.map((p) => p.productName).filter(Boolean).join(", ") || t("customer.noProduct")}
                                </span>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                  isPaid
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : isPartial
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                                }`}>
                                  {isPaid ? "✓ Paid" : isPartial ? "Partial" : "Unpaid"}
                                </span>
                                {txn.billType && (
                                  <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                                    {txn.billType}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-400">
                                <span>📅 {new Date(txn.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                <span>{new Date(txn.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                                {txn.paymentMode && <span className="capitalize">💳 {txn.paymentMode}</span>}
                              </div>
                            </div>

                            {/* Amount */}
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-gray-900">{inrFmt(total)}</p>
                              {!isPaid && (
                                <p className="text-xs text-red-500 font-semibold">{inrFmt(due)} due</p>
                              )}
                              {isPaid && (
                                <p className="text-xs text-green-600 font-semibold">Cleared</p>
                              )}
                            </div>
                          </div>

                          {/* Action bar */}
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                            <button
                              type="button"
                              onClick={() => toggleTransaction(txn.id)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                            >
                              {isOpen ? "▲ Hide details" : "▼ View details"}
                            </button>
                            <div className="flex-1" />
                            <button
                              type="button"
                              onClick={() => handleOpenInvoice(txn)}
                              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              🧾 Invoice
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEdit(txn)}
                              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              ✏ Edit
                            </button>
                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() => { setCollectTx(txn); setCollectError(""); }}
                                className="px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors"
                              >
                                Collect due
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expandable detail panel */}
                        {isOpen && (
                          <div className="border-t border-gray-100 bg-gray-50/60 rounded-b-xl px-4 py-4">
                            {/* Product breakdown table */}
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Items</p>
                            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                              <table className="w-full text-xs">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                  <tr>
                                    <th className="px-3 py-2.5 text-left text-gray-500 font-semibold">Item</th>
                                    <th className="px-2 py-2.5 text-center text-gray-500 font-semibold">Metal</th>
                                    <th className="px-2 py-2.5 text-right text-gray-500 font-semibold">Wt (g)</th>
                                    <th className="px-2 py-2.5 text-right text-gray-500 font-semibold">Rate/g</th>
                                    <th className="px-2 py-2.5 text-right text-gray-500 font-semibold">Making</th>
                                    {txn.products?.some(p => (p.diamondCharge || 0) > 0) && (
                                      <th className="px-2 py-2.5 text-right text-gray-500 font-semibold">Diamond</th>
                                    )}
                                    <th className="px-3 py-2.5 text-right text-gray-500 font-semibold">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(txn.products || []).map((p, pi) => (
                                    <tr key={pi} className={pi % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                      <td className="px-3 py-2 font-medium text-gray-800">
                                        {p.productName || "—"}
                                        {p.qty && Number(p.qty) !== 1 && (
                                          <span className="ml-1 text-gray-400">×{p.qty}</span>
                                        )}
                                      </td>
                                      <td className="px-2 py-2 text-center text-gray-500 capitalize">{p.metalType || "—"}</td>
                                      <td className="px-2 py-2 text-right text-gray-700">{p.weight != null ? Number(p.weight).toFixed(3) : "—"}</td>
                                      <td className="px-2 py-2 text-right text-gray-700">{p.rate != null ? inrFmt(p.rate) : "—"}</td>
                                      <td className="px-2 py-2 text-right text-gray-700">{p.makingCharge != null ? inrFmt(p.makingCharge) : "—"}</td>
                                      {txn.products?.some(p2 => (p2.diamondCharge || 0) > 0) && (
                                        <td className="px-2 py-2 text-right text-gray-700">{p.diamondCharge != null ? inrFmt(p.diamondCharge) : "—"}</td>
                                      )}
                                      <td className="px-3 py-2 text-right font-bold text-gray-900">{p.total != null ? inrFmt(p.total) : "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Payment summary strip */}
                            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-200 text-center">
                              <div>
                                <p className="text-[11px] text-gray-400">Grand Total</p>
                                <p className="text-sm font-bold text-gray-900">{inrFmt(total)}</p>
                              </div>
                              <div className="border-x border-gray-200">
                                <p className="text-[11px] text-gray-400">Paid</p>
                                <p className="text-sm font-bold text-green-600">{inrFmt(paid)}</p>
                              </div>
                              <div>
                                <p className="text-[11px] text-gray-400">Due</p>
                                <p className={`text-sm font-bold ${due > 0 ? "text-red-500" : "text-gray-400"}`}>
                                  {due > 0 ? inrFmt(due) : "Cleared"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* ── Girvi tab ─────────────────────────────────── */}
          {sectionFilter === "girvi" && (
            <>
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-sm font-semibold text-gray-800">{t("customer.filterGirvi")}</h2>
              </div>
              {girviLoans.length === 0 ? (
                <div className="py-16 text-center text-gray-400">{t("customer.noGirviFound")}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {[t("customer.tableNo"), t("customer.girviDescription"), t("customer.girviPrincipal"), t("customer.girviStartDate"), t("customer.orderStatus")].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {girviLoans.map((loan, i) => (
                        <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                          <td className="px-4 py-3 text-gray-800 max-w-xs">{loan.jewelry_description}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{formatRupee(loan.principal_amount)}</td>
                          <td className="px-4 py-3 text-gray-500">{formatDate(loan.start_date)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${loan.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                              {loan.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Orders tab ────────────────────────────────── */}
          {sectionFilter === "orders" && (
            <>
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-sm font-semibold text-gray-800">{t("customer.filterOrders")}</h2>
              </div>
              {ordersNew.length === 0 ? (
                <div className="py-16 text-center text-gray-400">{t("customer.noOrdersFound")}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {[t("customer.tableNo"), t("customer.orderItem"), t("customer.orderDescription"), t("customer.orderExpectedDate"), t("customer.orderStatus"), t("customer.orderAmount")].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ordersNew.map((ord, i) => (
                        <tr key={ord.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                          <td className="px-4 py-3 text-gray-800">{ord.item_description || "—"}</td>
                          <td className="px-4 py-3 text-gray-500 max-w-xs">{ord.description || "—"}</td>
                          <td className="px-4 py-3 text-gray-500">{formatDate(ord.expected_date)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${ord.status === "delivered" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                              {ord.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{ord.amount_charged != null ? formatRupee(ord.amount_charged) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Repairs tab ───────────────────────────────── */}
          {sectionFilter === "repairs" && (
            <>
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-sm font-semibold text-gray-800">{t("customer.filterRepairs")}</h2>
              </div>
              {ordersRepair.length === 0 ? (
                <div className="py-16 text-center text-gray-400">{t("customer.noRepairsFound")}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {[t("customer.tableNo"), t("customer.orderItem"), t("customer.orderDescription"), t("customer.orderExpectedDate"), t("customer.orderStatus"), t("customer.orderAmount")].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ordersRepair.map((ord, i) => (
                        <tr key={ord.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                          <td className="px-4 py-3 text-gray-800">{ord.item_description || "—"}</td>
                          <td className="px-4 py-3 text-gray-500 max-w-xs">{ord.description || "—"}</td>
                          <td className="px-4 py-3 text-gray-500">{formatDate(ord.expected_date)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${ord.status === "delivered" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                              {ord.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{ord.amount_charged != null ? formatRupee(ord.amount_charged) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Metal Advance tab ─────────────────────────── */}
          {sectionFilter === "metalAdvance" && (
            <>
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-sm font-semibold text-gray-800">{t("customer.metalAdvanceTab")}</h2>
              </div>
              {advanceBalanceRow && (
                <div className="grid grid-cols-2 gap-4 px-5 py-4 bg-amber-50/50 border-b border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t("customer.metalAdvanceMetal")}</p>
                    <p className="text-lg font-bold text-gray-900">{(advanceBalanceRow.advance_metal_weight ?? 0).toFixed(3)} g</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t("customer.metalAdvanceMoney")}</p>
                    <p className="text-lg font-bold text-gray-900">{formatRupee(advanceBalanceRow.advance_money ?? 0)}</p>
                  </div>
                </div>
              )}
              {metalAdvanceRows.length === 0 ? (
                <div className="py-16 text-center text-gray-400">{t("customer.noMetalAdvanceEntries")}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {[t("customer.metalColDate"), t("customer.metalColType"), t("customer.metalColMetal"), t("customer.metalColRawG"), t("customer.metalColPureG"), t("customer.metalColCash"), t("customer.metalColNotes")].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {metalAdvanceRows.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-500">{row.exchange_date ? new Date(row.exchange_date).toLocaleDateString("en-IN") : "—"}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{METAL_TYPE_LABELS[row.type] || row.type}</td>
                          <td className="px-4 py-3 text-gray-700">{row.metal_type || "—"}</td>
                          <td className="px-4 py-3 text-right">{row.raw_weight ?? "—"}</td>
                          <td className="px-4 py-3 text-right">{row.pure_weight ?? "—"}</td>
                          <td className="px-4 py-3 text-right">{row.cash_amount != null ? formatRupee(row.cash_amount) : "—"}</td>
                          <td className="px-4 py-3 text-gray-500 max-w-xs">{row.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Metal Exchange tab ────────────────────────── */}
          {sectionFilter === "metalExchange" && (
            <>
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-sm font-semibold text-gray-800">{t("customer.metalExchangeTab")}</h2>
              </div>
              {metalTradeRows.length === 0 ? (
                <div className="py-16 text-center text-gray-400">{t("customer.noMetalExchangeEntries")}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {[t("customer.metalColDate"), t("customer.metalColType"), t("customer.metalColMetal"), t("customer.metalColRawG"), t("customer.metalColPureG"), t("customer.metalColCash"), t("customer.metalColNotes")].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {metalTradeRows.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-500">{row.exchange_date ? new Date(row.exchange_date).toLocaleDateString("en-IN") : "—"}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{METAL_TYPE_LABELS[row.type] || row.type}</td>
                          <td className="px-4 py-3 text-gray-700">{row.metal_type || "—"}</td>
                          <td className="px-4 py-3 text-right">{row.raw_weight ?? "—"}</td>
                          <td className="px-4 py-3 text-right">{row.pure_weight ?? "—"}</td>
                          <td className="px-4 py-3 text-right">{row.cash_amount != null ? formatRupee(row.cash_amount) : "—"}</td>
                          <td className="px-4 py-3 text-gray-500 max-w-xs">{row.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Collect Payment Modal ────────────────────────────────── */}
        <CollectPaymentModal
          tx={collectTx}
          onClose={() => { setCollectTx(null); setCollectError(""); }}
          onSubmit={async (amount, mode) => {
            const due = parseFloat(collectTx?.dueAmount ?? 0);
            if (!amount || amount <= 0) return setCollectError("Enter a valid amount");
            if (amount > due + 0.01) return setCollectError(`Cannot collect more than due ₹${due.toFixed(2)}`);
            setCollectLoading(true);
            setCollectError("");
            try {
              const newPaid = (parseFloat(collectTx.paidAmount ?? 0) + amount);
              const newDue  = Math.max(0, due - amount);
              const res = await fetch(`${API_BASE}/api/transactions/${collectTx.id}/record-payment`, {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ amount, payment_mode: mode, notes: "" }),
              });
              if (res.status === 401) { navigate("/login"); return; }
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(parseApiError(errData, "Failed to record payment. Please try again."));
              }
              await res.json();
              setTransactions((prev) =>
                prev.map((t) =>
                  t.id === collectTx.id
                    ? { ...t, paidAmount: newPaid, dueAmount: newDue, paid_amount: newPaid, due_amount: newDue }
                    : t
                )
              );
              setCollectTx(null);
            } catch (e) {
              setCollectError(e.message);
            } finally {
              setCollectLoading(false);
            }
          }}
          loading={collectLoading}
          error={collectError}
          inrFmt={inrFmt}
        />

        {/* ── Edit Transaction Modal ───────────────────────────────── */}
        {showEditModal && selectedTransaction && (
          <EditProductPopup
            productData={selectedTransaction}
            isOpen={showEditModal}
            onUpdate={handleUpdateTransaction}
            onClose={handleCloseModal}
          />
        )}

        {/* ── Invoice Modal ────────────────────────────────────────── */}
        <InvoicePreviewModal
          isOpen={showInvoiceModal}
          onClose={handleCloseInvoiceModal}
          transactionId={invoiceTransactionId}
          invoiceData={invoiceData}
          loading={invoiceLoading}
          error={invoiceError}
          onErrorDismiss={() => setInvoiceError("")}
          t={t}
        />

        {/* ── Edit Customer Drawer ─────────────────────────────────── */}
        <AddCustomerDrawer
          isOpen={showEditCustomer}
          onClose={() => setShowEditCustomer(false)}
          initialData={customer}
          onAdd={(updated) => {
            setCustomer((prev) => ({ ...prev, ...updated }));
            setShowEditCustomer(false);
          }}
        />

      </div>
    </div>
  );
};

export default CustomerAccount;
