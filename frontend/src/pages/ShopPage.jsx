import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import ShopLayout from "../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../api";
import { parseApiError } from "../utils/apiError";
import { XMarkIcon } from "@heroicons/react/24/outline";
import CustomerSelectionStep from "../components/shop/CustomerSelectionStep";
import GSTPanel from "../components/shop/GSTPanel";
import {
  createProduct,
  calculateAllProductTotals,
  grandTotalFromProducts,
  getWeightUnit,
  parseNumber,
} from "../utils/productCalculations";
import { PageContainer } from "../components/ui/PageSection";
import InlineError from "../components/ui/InlineError";

// Redirect to login on 401 anywhere in this page
function requireAuth(res) {
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }
  return res;
}

const GST_INITIAL = {
  enabled: false,
  hsn_code: "7113",
  making_charges: "",
  is_interstate: false,
  customer_gstin: "",
};

const PAYMENT_MODES = [
  { value: "cash",   label: "💵 Cash" },
  { value: "upi",    label: "📱 UPI" },
  { value: "card",   label: "💳 Card" },
  { value: "credit", label: "📒 Credit" },
];

const BILL_TYPES = [
  { value: "For Material",  label: "Material" },
  { value: "Cash Exchange", label: "Exchange" },
  { value: "Making Only",   label: "Making only" },
];

// ─── tiny helpers ────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function ShopPage() {
  const [searchParams] = useSearchParams();
  const customerIdFromUrl = searchParams.get("customerId");
  const orderIdFromUrl = searchParams.get("orderId");

  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState(null);
  const [customerMode, setCustomerMode] = useState("existing");
  const [customersList, setCustomersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [error, setError] = useState("");

  const [products, setProducts] = useState([createProduct()]);
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [billType, setBillType] = useState("For Material");

  // ── Metal rates (auto-fill) ───────────────────────────────────────────────
  const [metalRates, setMetalRates] = useState({});   // { gold: 7245, silver: 89000, ... }
  const [ratesLoaded, setRatesLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/metal-rates/current`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : [])
      .then((list) => {
        const map = {};
        (list || []).forEach((r) => { map[r.metal_type] = r.rate_per_unit; });
        setMetalRates(map);
        setRatesLoaded(true);
      })
      .catch(() => setRatesLoaded(true));
  }, []);

  // ── GST state ─────────────────────────────────────────────────────────────
  const [gstData, setGstData] = useState({ ...GST_INITIAL });
  const [gstPreview, setGstPreview] = useState(null);
  const [gstLoading, setGstLoading] = useState(false);

  const updateGst = (patch) => setGstData((g) => ({ ...g, ...patch }));

  useEffect(() => {
    if (!gstData.enabled) { setGstPreview(null); return; }
    const itemValue = grandTotalFromProducts(calculateAllProductTotals(products))
                      - parseNumber(gstData.making_charges);
    if (itemValue <= 0) { setGstPreview(null); return; }
    const controller = new AbortController();
    setGstLoading(true);
    const params = new URLSearchParams({
      item_value: itemValue.toFixed(2),
      making_charges: parseNumber(gstData.making_charges).toFixed(2),
      hsn_code: gstData.hsn_code,
      making_hsn_code: "9988",
      is_interstate: gstData.is_interstate,
    });
    fetch(`${API_BASE}/api/gst/calculate?${params}`, { headers: authHeaders(), signal: controller.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setGstPreview(d))
      .catch(() => {})
      .finally(() => setGstLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gstData.enabled, gstData.hsn_code, gstData.making_charges, gstData.is_interstate, products]);

  // ── Load customer from URL ────────────────────────────────────────────────
  useEffect(() => {
    if (!customerIdFromUrl) return;
    fetch(`${API_BASE}/api/customer/${customerIdFromUrl}`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) { setCustomer(data); setStep(2); } })
      .catch(() => {});
  }, [customerIdFromUrl]);

  // ── Pre-fill from order when orderId is in URL ────────────────────────────
  useEffect(() => {
    if (!orderIdFromUrl) return;
    fetch(`${API_BASE}/api/orders/${orderIdFromUrl}`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((order) => {
        if (!order) return;
        // Pre-fill product name from item_description or description
        const name = order.item_description || order.description || "";
        // Pre-fill making charge from amount_charged (the order's quoted amount)
        const making = order.amount_charged ? String(order.amount_charged) : "";
        setProducts([createProduct({ productName: name, makingCharge: making })]);
        // Pre-fill paid amount from cash advance
        if (order.advance_cash && parseFloat(order.advance_cash) > 0) {
          setPaidAmount(String(order.advance_cash));
        }
        // Set bill type to Making Only since it's an order/repair
        setBillType("Making Only");
      })
      .catch(() => {});
  }, [orderIdFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === 1 && customerMode === "existing") {
      fetch(`${API_BASE}/api/customer/all`, { headers: authHeaders() })
        .then((r) => r.ok ? r.json() : [])
        .then((data) => setCustomersList(Array.isArray(data) ? data : []))
        .catch(() => setCustomersList([]));
    }
  }, [step, customerMode]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const calculatedProducts = calculateAllProductTotals(products);
  const grandTotal = grandTotalFromProducts(calculatedProducts);
  const dueAmount = grandTotal - parseNumber(paidAmount);

  const handleProductChange = useCallback((index, field, value) => {
    setProducts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

      // ── Auto-fill rate when metal type changes ──
      if (field === "metalType" && metalRates[value] != null) {
        next[index].rate = String(metalRates[value]);
        next[index].rateAutoFilled = true;
      } else if (field === "rate") {
        next[index].rateAutoFilled = false;
      }
      return next;
    });
  }, [metalRates]);

  // Auto-fill rates for initial product once rates load
  useEffect(() => {
    if (!ratesLoaded) return;
    setProducts((prev) => prev.map((p) => {
      if (p.rate === "" && metalRates[p.metalType] != null) {
        return { ...p, rate: String(metalRates[p.metalType]), rateAutoFilled: true };
      }
      return p;
    }));
  }, [ratesLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const addProduct = () => {
    const newP = createProduct();
    if (metalRates["gold"] != null) { newP.rate = String(metalRates["gold"]); newP.rateAutoFilled = true; }
    setProducts((prev) => [...prev, newP]);
  };
  const removeProduct = (i) => products.length > 1 && setProducts((p) => p.filter((_, j) => j !== i));

  const handleSaleSubmit = async () => {
    if (!customer?.id) return;
    setError(""); setLoading(true);
    try {
      const body = {
        customerId: customer.id,
        customerName: customer.name,
        products: calculatedProducts.map((p) => {
          const pid = parseInt(String(p.pieceId ?? "").trim(), 10);
          return { ...p, pieceId: Number.isFinite(pid) && pid > 0 ? pid : null };
        }),
        paidAmount: parseNumber(paidAmount),
        dueAmount: Math.max(dueAmount, 0),
        grandTotal,
        date: new Date().toISOString(),
        billType: billType || "For Material",
        payment_mode: paymentMode,
      };
      if (gstData.enabled && gstData.hsn_code) {
        body.gst = {
          hsn_code: gstData.hsn_code,
          making_charges: parseNumber(gstData.making_charges),
          is_interstate: gstData.is_interstate,
          customer_gstin: gstData.customer_gstin || null,
        };
      }
      const res = await fetch(`${API_BASE}/api/transactions/add`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify(body),
      }).then(requireAuth);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(parseApiError(d, "Failed to save transaction. Please try again.")); return;
      }
      setSaleSuccess(true);
      setProducts([createProduct()]);
      setPaidAmount(""); setPaymentMode("cash");
      setGstData({ ...GST_INITIAL }); setGstPreview(null);
    } catch (err) {
      setError(err.message || "Failed to save transaction.");
    } finally { setLoading(false); }
  };

  const resetToCustomer = () => {
    setStep(1); setCustomer(null); setSaleSuccess(false);
    setGstData({ ...GST_INITIAL }); setGstPreview(null);
  };

  const resetToSale = () => {
    setSaleSuccess(false);
    setProducts([createProduct()]);
    setPaidAmount(""); setPaymentMode("cash");
    setGstData({ ...GST_INITIAL }); setGstPreview(null);
  };

  // ─── field style helpers ────────────────────────────────────────────────
  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors";

  return (
    <ShopLayout>
      <PageContainer maxWidth="max-w-4xl">
        {/* Page header */}
        <div className="mb-6">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Billing</p>
          <h1 className="text-2xl font-extrabold text-gray-900">Create Bill</h1>
        </div>

        {error && <InlineError message={error} onDismiss={() => setError("")} className="mb-4" />}

        {/* ── Step 1: Customer selection ─────────────────────────── */}
        {step === 1 && (
          <CustomerSelectionStep
            customerMode={customerMode}
            onModeChange={setCustomerMode}
            customersList={customersList}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectCustomer={(c) => { setCustomer(c); setStep(2); }}
          />
        )}

        {/* ── Step 2: Billing ────────────────────────────────────── */}
        {step === 2 && customer && (
          <div className="border-2 border-blue-100 rounded-2xl shadow-md bg-white overflow-hidden">
            {saleSuccess ? (
              /* ── Success screen ──────────────────────────────────── */
              <div className="text-center py-14 px-6">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Transaction saved!</h3>
                <p className="text-gray-500 text-sm mb-8">
                  Sale recorded for <span className="font-semibold text-gray-800">{customer.name}</span>
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button type="button" onClick={resetToSale}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 shadow-sm transition-colors">
                    + New sale (same customer)
                  </button>
                  <button type="button" onClick={resetToCustomer}
                    className="px-6 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors">
                    Change customer
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* ── Customer bar ─────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-base shrink-0 ring-2 ring-white/30">
                      {customer.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm leading-tight">{customer.name}</div>
                      <div className="text-blue-100 text-xs">{customer.primary_phone || "—"}</div>
                    </div>
                  </div>
                  <button type="button" onClick={resetToCustomer}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-white text-xs font-semibold transition-colors">
                    ↩ Change customer
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* ── Bill type ──────────────────────────────────── */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bill Type</p>
                    <div className="flex gap-2 flex-wrap">
                      {BILL_TYPES.map((bt) => (
                        <button key={bt.value} type="button"
                          onClick={() => setBillType(bt.value)}
                          className={`px-5 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                            billType === bt.value
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm scale-105"
                              : "border-gray-200 text-gray-500 hover:border-blue-200 hover:text-blue-600"
                          }`}>
                          {bt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Divider ────────────────────────────────────── */}
                  <div className="border-t border-gray-100" />

                  {/* ── Product items ───────────────────────────────── */}
                  <div className="space-y-4">
                    {products.map((product, index) => {
                      const calc = calculatedProducts[index];
                      return (
                        <div key={product._uid || index}
                          className="border-2 border-gray-100 hover:border-blue-100 rounded-xl bg-gray-50 transition-colors">
                          {/* Item header */}
                          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                                {index + 1}
                              </span>
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Item {index + 1}
                              </span>
                            </div>
                            {products.length > 1 && (
                              <button type="button" onClick={() => removeProduct(index)}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium">
                                <XMarkIcon className="h-3.5 w-3.5" /> Remove
                              </button>
                            )}
                          </div>

                          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                            {/* Product name */}
                            <div className="col-span-2 md:col-span-4">
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                                Product name
                              </label>
                              <input type="text" value={product.productName}
                                onChange={(e) => handleProductChange(index, "productName", e.target.value)}
                                className={inputCls} placeholder="e.g. Gold chain, Diamond ring…"
                              />
                            </div>

                            {/* Metal type */}
                            <div className="col-span-2">
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                                Metal type
                              </label>
                              <select value={product.metalType}
                                onChange={(e) => handleProductChange(index, "metalType", e.target.value)}
                                className={inputCls}>
                                <option value="gold">Gold (per gram)</option>
                                <option value="silver">Silver (per kg)</option>
                                <option value="platinum">Platinum (per gram)</option>
                                <option value="diamond">Diamond (per piece)</option>
                                <option value="other">Other</option>
                              </select>
                            </div>

                            {/* Rate */}
                            <div className="col-span-2">
                              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                                Rate (₹ / {getWeightUnit(product.metalType)})
                                {product.rateAutoFilled && (
                                  <span className="normal-case font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 text-xs">
                                    ✓ today's rate
                                  </span>
                                )}
                              </label>
                              <input type="number" min="0" step="1"
                                value={product.rate}
                                onChange={(e) => handleProductChange(index, "rate", e.target.value)}
                                className={inputCls} placeholder="e.g. 7245"
                              />
                            </div>

                            {/* Qty */}
                            <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Qty</label>
                              <input type="number" min="1" step="1"
                                value={product.qty ?? "1"}
                                onChange={(e) => handleProductChange(index, "qty", e.target.value)}
                                className={inputCls}
                              />
                            </div>

                            {/* Weight */}
                            <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                                Weight ({getWeightUnit(product.metalType)})
                              </label>
                              <input type="number" min="0" step="0.001"
                                value={product.weight}
                                onChange={(e) => handleProductChange(index, "weight", e.target.value)}
                                className={inputCls} placeholder="0.000"
                              />
                            </div>

                            {/* Making */}
                            <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Making (₹)</label>
                              <input type="number" min="0" step="1"
                                value={product.makingCharge}
                                onChange={(e) => handleProductChange(index, "makingCharge", e.target.value)}
                                className={inputCls} placeholder="0"
                              />
                            </div>

                            {/* Stone */}
                            <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Stone (₹)</label>
                              <input type="number" min="0" step="1"
                                value={product.diamondCharge}
                                onChange={(e) => handleProductChange(index, "diamondCharge", e.target.value)}
                                className={inputCls} placeholder="0"
                              />
                            </div>

                            {/* Stock link */}
                            <div className="col-span-2">
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                                Stock item ID <span className="normal-case font-normal text-gray-300">(optional)</span>
                              </label>
                              <input type="number" min="1"
                                placeholder="Link to inventory item"
                                value={product.pieceId}
                                onChange={(e) => handleProductChange(index, "pieceId", e.target.value)}
                                className={inputCls}
                              />
                            </div>
                          </div>

                          {/* Per-item total bar */}
                          <div className="px-4 py-2.5 bg-blue-50 border-t border-blue-100 rounded-b-xl flex items-center justify-between">
                            <div className="flex gap-4 text-xs text-gray-400">
                              <span>Metal <span className="text-gray-600 font-semibold ml-1">₹{fmt(calc?.metalValue ?? 0)}</span></span>
                              <span>Making <span className="text-gray-600 font-semibold ml-1">₹{fmt(parseNumber(product.makingCharge))}</span></span>
                              <span>Stone <span className="text-gray-600 font-semibold ml-1">₹{fmt(parseNumber(product.diamondCharge))}</span></span>
                            </div>
                            <div className="text-blue-700 font-bold text-sm">
                              ₹{fmt(calc?.total ?? 0)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Add item ─────────────────────────────────────── */}
                  <button type="button" onClick={addProduct}
                    className="w-full py-3 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 text-sm font-bold hover:bg-blue-50 hover:border-blue-400 transition-all">
                    + Add another item
                  </button>

                  {/* ── GST Invoice (single GST control) ─────────────── */}
                  <div>
                    <GSTPanel
                      itemValue={grandTotal}
                      gstData={gstData}
                      onChange={updateGst}
                      preview={gstPreview}
                      loading={gstLoading}
                    />
                  </div>

                  {/* ── Payment section ───────────────────────────────── */}
                  <div className="border-2 border-gray-100 rounded-xl overflow-hidden">
                    {/* Payment mode */}
                    <div className="px-5 py-4 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Payment Mode</p>
                      <div className="flex gap-2 flex-wrap">
                        {PAYMENT_MODES.map((pm) => (
                          <button key={pm.value} type="button"
                            onClick={() => setPaymentMode(pm.value)}
                            className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                              paymentMode === pm.value
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm scale-105"
                                : "border-gray-200 text-gray-500 hover:border-blue-200 hover:text-blue-600"
                            }`}>
                            {pm.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="px-5 py-4 grid grid-cols-3 gap-4 items-end bg-gray-50/50">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Grand Total</p>
                        <p className="text-2xl font-extrabold text-gray-900">₹{fmt(grandTotal)}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                          Paid (₹)
                        </label>
                        <input type="number" min="0" step="1"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(e.target.value)}
                          className={inputCls}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Due</p>
                        <p className={`text-2xl font-extrabold ${dueAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                          ₹{fmt(Math.max(dueAmount, 0))}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Actions ──────────────────────────────────────── */}
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={handleSaleSubmit} disabled={loading}
                      className="flex-1 sm:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-all hover:shadow-md">
                      {loading ? "Saving…" : "💾 Save transaction"}
                    </button>
                    <button type="button" onClick={resetToCustomer}
                      className="px-5 py-3 border-2 border-gray-200 rounded-xl text-gray-500 font-semibold text-sm hover:border-gray-300 hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </PageContainer>
    </ShopLayout>
  );
}
