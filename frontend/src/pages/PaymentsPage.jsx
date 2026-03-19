import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import ShopLayout from "../components/layout/ShopLayout";
import CustomerSelectWithAdd from "../components/ui/CustomerSelectWithAdd";
import { API_BASE, authHeaders } from "../api";
import { useLanguage } from "../context/LanguageContext";

function normalizePhone(s) {
  if (s == null || s === "") return "";
  return String(s).replace(/\D/g, "");
}

function customerMatchesPhoneQuery(customer, queryDigits) {
  if (!queryDigits) return false;
  const p1 = normalizePhone(customer.primary_phone);
  const p2 = normalizePhone(customer.secondary_phone);
  return (
    p1.includes(queryDigits) ||
    p2.includes(queryDigits) ||
    p1.endsWith(queryDigits) ||
    p2.endsWith(queryDigits)
  );
}

const TAB_IDS = ["record", "outstanding", "history"];

export default function PaymentsPage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "record";
  const [activeTab, setActiveTab] = useState(
    TAB_IDS.includes(tabFromUrl) ? tabFromUrl : "record"
  );
  const [outstanding, setOutstanding] = useState({ items: [], totalDue: 0, count: 0 });
  const [history, setHistory] = useState([]);
  const [loadingOutstanding, setLoadingOutstanding] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [recordLookupMode, setRecordLookupMode] = useState("bill");
  const [recordCustomerId, setRecordCustomerId] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [phonePickCustomerId, setPhonePickCustomerId] = useState("");
  const [phoneMatchedIds, setPhoneMatchedIds] = useState([]);
  const [recordTransactionId, setRecordTransactionId] = useState("");
  const [recordAmount, setRecordAmount] = useState("");
  const [recordMode, setRecordMode] = useState("Cash");
  const [recordSubmitting, setRecordSubmitting] = useState(false);
  const [recordError, setRecordError] = useState(null);
  const [recordSuccess, setRecordSuccess] = useState(false);
  const navigate = useNavigate();

  const tabLabels = {
    record: t("payments.recordPayment"),
    outstanding: t("payments.outstandingBalance"),
    history: t("payments.paymentHistory"),
  };

  useEffect(() => {
    const t0 = searchParams.get("tab") || "record";
    if (TAB_IDS.includes(t0)) setActiveTab(t0);
  }, [searchParams]);

  const switchTab = (id) => {
    setActiveTab(id);
    setSearchParams(id === "record" ? {} : { tab: id });
  };

  const loadOutstanding = () => {
    setLoadingOutstanding(true);
    fetch(`${API_BASE}/api/payments/outstanding`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { items: [], totalDue: 0, count: 0 }))
      .then((data) => setOutstanding(data))
      .catch(() => setOutstanding({ items: [], totalDue: 0, count: 0 }))
      .finally(() => setLoadingOutstanding(false));
  };

  useEffect(() => {
    loadOutstanding();
  }, []);

  useEffect(() => {
    if (activeTab !== "outstanding") return;
    loadOutstanding();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "history") return;
    setLoadingHistory(true);
    fetch(`${API_BASE}/api/payments/history`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [activeTab]);

  const billsForRecordCustomer = useMemo(() => {
    const items = outstanding.items || [];
    if (recordLookupMode !== "customer" || !recordCustomerId) return [];
    return items.filter((row) => String(row.customerId) === String(recordCustomerId));
  }, [outstanding.items, recordLookupMode, recordCustomerId]);

  const billsForPhoneCustomer = useMemo(() => {
    const items = outstanding.items || [];
    const cid = phonePickCustomerId;
    if (recordLookupMode !== "phone" || !cid) return [];
    return items.filter((row) => String(row.customerId) === String(cid));
  }, [outstanding.items, recordLookupMode, phonePickCustomerId]);

  const runPhoneLookup = async () => {
    setRecordError(null);
    setPhoneMatchedIds([]);
    setPhonePickCustomerId("");
    const q = normalizePhone(phoneSearch);
    if (!q || q.length < 4) {
      setRecordError(t("payments.enterPhone"));
      return;
    }
    const res = await fetch(`${API_BASE}/api/customer/all`, { headers: authHeaders() });
    const list = res.ok ? await res.json() : [];
    const customers = Array.isArray(list) ? list : [];
    const matched = customers.filter((c) => customerMatchesPhoneQuery(c, q));
    const ids = matched.map((c) => String(c.id));
    setPhoneMatchedIds(ids);
    if (ids.length === 0) {
      setRecordError(t("payments.noCustomerForPhone"));
    } else if (ids.length === 1) {
      setPhonePickCustomerId(ids[0]);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setRecordError(null);
    setRecordSuccess(false);
    const txnId = parseInt(recordTransactionId, 10);
    const amount = parseFloat(recordAmount);
    if (!txnId || txnId < 1 || !amount || amount <= 0) {
      setRecordError("Enter a valid bill number and amount.");
      return;
    }
    setRecordSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/transactions/${txnId}/record-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ amount, payment_mode: recordMode || null }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRecordError(data.detail || "Failed to record payment.");
        return;
      }
      setRecordSuccess(true);
      setRecordTransactionId("");
      setRecordAmount("");
      loadOutstanding();
    } catch {
      setRecordError("Network error.");
    } finally {
      setRecordSubmitting(false);
    }
  };

  const pickBillRow = (row) => {
    setRecordTransactionId(String(row.id));
    setRecordAmount(String(row.dueAmount ?? ""));
    setRecordError(null);
    setRecordSuccess(false);
  };

  return (
    <ShopLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t("payments.title")}</h1>
        <div className="flex gap-2 border-b border-gray-200 mb-6">
          {TAB_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition ${
                activeTab === id
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {tabLabels[id]}
            </button>
          ))}
        </div>

        {activeTab === "record" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{t("payments.recordPayment")}</h2>
            <p className="text-sm font-medium text-gray-700 mb-2">{t("payments.findBillBy")}</p>
            <div className="flex flex-wrap gap-4 mb-6">
              {[
                { id: "bill", label: t("payments.byBillId") },
                { id: "customer", label: t("payments.byCustomer") },
                { id: "phone", label: t("payments.byPhone") },
              ].map((opt) => (
                <label key={opt.id} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="recordLookup"
                    checked={recordLookupMode === opt.id}
                    onChange={() => {
                      setRecordLookupMode(opt.id);
                      setRecordError(null);
                      setRecordSuccess(false);
                    }}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-800">{opt.label}</span>
                </label>
              ))}
            </div>

            {recordLookupMode === "customer" && (
              <div className="mb-6 space-y-3">
                <CustomerSelectWithAdd
                  id="payment-record-customer"
                  value={recordCustomerId}
                  onChange={(v) => {
                    setRecordCustomerId(v);
                    setRecordError(null);
                  }}
                  label={`${t("payments.byCustomer")} *`}
                />
                <p className="text-sm text-gray-500">{t("payments.pickBillHint")}</p>
                {loadingOutstanding ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
                  </div>
                ) : billsForRecordCustomer.length === 0 && recordCustomerId ? (
                  <p className="text-sm text-amber-700">{t("payments.noBillsForSelection")}</p>
                ) : (
                  billsForRecordCustomer.length > 0 && (
                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">{t("payments.byBillId")}</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">{t("customer.tableAmount")}</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">{t("customer.dueAmount")}</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">{t("customer.date")}</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">{t("customer.tableActions")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {billsForRecordCustomer.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium">{row.id}</td>
                              <td className="px-3 py-2 text-right">
                                ₹{(row.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right text-amber-700">
                                ₹{(row.dueAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-500">
                                {row.date ? new Date(row.date).toLocaleDateString() : "—"}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => pickBillRow(row)}
                                  className="text-blue-600 hover:underline font-medium"
                                >
                                  {t("payments.recordPayment")}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            )}

            {recordLookupMode === "phone" && (
              <div className="mb-6 space-y-3">
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("payments.enterPhone")}</label>
                    <input
                      type="text"
                      value={phoneSearch}
                      onChange={(e) => setPhoneSearch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={runPhoneLookup}
                    className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-200"
                  >
                    {t("payments.findBills")}
                  </button>
                </div>
                <CustomerSelectWithAdd
                  id="payment-phone-alt-customer"
                  value={phonePickCustomerId}
                  onChange={(v) => {
                    setPhonePickCustomerId(v);
                    setPhoneMatchedIds([]);
                    setPhoneSearch("");
                    setRecordError(null);
                  }}
                  label={t("payments.orSelectAddCustomer")}
                />
                {phoneMatchedIds.length > 1 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{t("payments.multipleCustomersPhone")}</p>
                    <CustomerPhonePickList
                      ids={phoneMatchedIds}
                      onSelect={setPhonePickCustomerId}
                      value={phonePickCustomerId}
                    />
                  </div>
                )}
                {phonePickCustomerId && (
                  <>
                    <p className="text-sm text-gray-500">{t("payments.pickBillHint")}</p>
                    {billsForPhoneCustomer.length === 0 ? (
                      <p className="text-sm text-amber-700">{t("payments.noBillsForSelection")}</p>
                    ) : (
                      <div className="overflow-x-auto border border-gray-200 rounded-md">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium text-gray-600">{t("payments.byBillId")}</th>
                              <th className="text-right px-3 py-2 font-medium text-gray-600">{t("customer.tableAmount")}</th>
                              <th className="text-right px-3 py-2 font-medium text-gray-600">{t("customer.dueAmount")}</th>
                              <th className="text-right px-3 py-2 font-medium text-gray-600">{t("customer.date")}</th>
                              <th className="text-right px-3 py-2 font-medium text-gray-600">{t("customer.tableActions")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {billsForPhoneCustomer.map((row) => (
                              <tr key={row.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium">{row.id}</td>
                                <td className="px-3 py-2 text-right">
                                  ₹{(row.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-right text-amber-700">
                                  ₹{(row.dueAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-500">
                                  {row.date ? new Date(row.date).toLocaleDateString() : "—"}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => pickBillRow(row)}
                                    className="text-blue-600 hover:underline font-medium"
                                  >
                                    {t("payments.recordPayment")}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4 max-w-md border-t border-gray-100 pt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("payments.byBillId")}</label>
                <input
                  type="number"
                  min="1"
                  value={recordTransactionId}
                  onChange={(e) => setRecordTransactionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g. 5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={recordAmount}
                  onChange={(e) => setRecordAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment mode</label>
                <select
                  value={recordMode}
                  onChange={(e) => setRecordMode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Bank">Bank</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {recordError && (
                <p className="text-sm text-red-600">{recordError}</p>
              )}
              {recordSuccess && (
                <p className="text-sm text-green-600">Payment recorded successfully.</p>
              )}
              <button
                type="submit"
                disabled={recordSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {recordSubmitting ? "Recording…" : t("payments.recordPayment")}
              </button>
            </form>
            <p className="mt-4 text-sm text-gray-500">
              You can find the Bill ID on the customer’s account page or in Outstanding Balance.
            </p>
          </div>
        )}

        {activeTab === "outstanding" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <span className="font-medium text-gray-800">Bills with due amount</span>
              <span className="text-sm text-gray-600">
                Total due: ₹{(outstanding.totalDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {loadingOutstanding ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
              </div>
            ) : outstanding.items?.length === 0 ? (
              <p className="px-6 py-8 text-gray-500 text-center">No outstanding bills.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Bill #</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Due</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {outstanding.items.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{row.id}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">{row.customerName}</td>
                        <td className="px-6 py-3 text-sm text-right text-gray-700">
                          ₹{(row.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3 text-sm text-right text-amber-700 font-medium">
                          ₹{(row.dueAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3 text-sm text-right text-gray-500">
                          {row.date ? new Date(row.date).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setRecordTransactionId(String(row.id));
                              setRecordAmount(String(row.dueAmount || 0));
                              switchTab("record");
                            }}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            Record payment
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/customer/${row.customerId}`)}
                            className="ml-3 text-sm font-medium text-gray-600 hover:text-gray-800"
                          >
                            View customer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            {loadingHistory ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
              </div>
            ) : history.length === 0 ? (
              <p className="px-6 py-8 text-gray-500 text-center">No payment history yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Bill #</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-700">
                          {p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700">{p.customerName}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">{p.transactionId}</td>
                        <td className="px-6 py-3 text-sm text-right font-medium text-green-700">
                          ₹{(p.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500">{p.paymentMode || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </ShopLayout>
  );
}

function CustomerPhonePickList({ ids, value, onSelect }) {
  const { t } = useLanguage();
  const [options, setOptions] = useState([]);

  useEffect(() => {
    if (!ids.length) {
      setOptions([]);
      return;
    }
    fetch(`${API_BASE}/api/customer/all`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        const all = Array.isArray(list) ? list : [];
        const idSet = new Set(ids.map(String));
        setOptions(all.filter((c) => idSet.has(String(c.id))));
      })
      .catch(() => setOptions([]));
  }, [ids]);

  return (
    <select
      value={value}
      onChange={(e) => onSelect(e.target.value)}
      className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md"
    >
      <option value="">{t("common.selectCustomer")}</option>
      {options.map((c) => (
        <option key={c.id} value={String(c.id)}>
          {c.name} ({c.primary_phone || "—"})
        </option>
      ))}
    </select>
  );
}
