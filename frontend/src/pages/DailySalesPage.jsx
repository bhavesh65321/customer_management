import React, { useState, useEffect } from "react";
import ShopLayout from "../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../api";
import { printReceipt } from "../utils/printReceipt";
import WhatsAppShareButton from "../components/ui/WhatsAppShareButton";
import { Spinner } from "../components/ui/Spinner";

export default function DailySalesPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDaily = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/analytics/daily-sales?date=${date}`,
          { headers: authHeaders() }
        );
        if (res.ok) {
          const data = await res.json();
          setSales(Array.isArray(data) ? data : []);
        } else {
          setSales([]);
        }
      } catch {
        setSales([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDaily();
  }, [date]);

  const storeName =
    typeof window !== "undefined"
      ? localStorage.getItem("shopName") || "My Shop"
      : "My Shop";

  const total = sales.reduce((s, t) => s + (t.grandTotal || 0), 0);

  return (
    <ShopLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Daily Sales</h1>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" center />
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {sales.length} transaction{sales.length !== 1 ? "s" : ""}
                </span>
                <span className="font-semibold text-gray-900">
                  Total: ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {sales.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No sales on this date.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount (₹)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sales.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {t.customerName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {t.date ? new Date(t.date).toLocaleTimeString() : "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                          {(t.grandTotal ?? 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Print / Save as PDF */}
                            <button
                              type="button"
                              title="Print / Save as PDF"
                              onClick={() =>
                                printReceipt({
                                  transaction: {
                                    ...t,
                                    customer_name: t.customerName,
                                    customer_phone: t.customerPhone,
                                    grand_total: t.grandTotal,
                                    due_amount: t.dueAmount,
                                    invoice_number: t.invoiceNumber || `TXN-${t.id}`,
                                    created_at: t.date,
                                  },
                                  storeName,
                                })
                              }
                              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a1 1 0 001-1v-4a1 1 0 00-1-1H9a1 1 0 00-1 1v4a1 1 0 001 1zm8-12V5a1 1 0 00-1-1H7a1 1 0 00-1 1v4h12z" />
                              </svg>
                            </button>
                            {/* WhatsApp */}
                            {t.customerPhone && (
                              <WhatsAppShareButton
                                phone={t.customerPhone}
                                storeName={storeName}
                                invoiceNumber={t.invoiceNumber || `TXN-${t.id}`}
                                amount={t.grandTotal}
                                dueAmount={t.dueAmount}
                                label=""
                                size="sm"
                                className="!px-1.5 !py-1.5"
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </ShopLayout>
  );
}
