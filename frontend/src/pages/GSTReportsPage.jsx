import React, { useState, useEffect, useCallback } from "react";
import ShopLayout from "../components/layout/ShopLayout";
import { apiGet, apiPost, API_BASE, authHeaders } from "../api";
import { PageContainer, SectionCard } from "../components/ui/PageSection";
import InlineError from "../components/ui/InlineError";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const INDIAN_STATES = [
  ["01","Jammu & Kashmir"],["02","Himachal Pradesh"],["03","Punjab"],
  ["04","Chandigarh"],["05","Uttarakhand"],["06","Haryana"],["07","Delhi"],
  ["08","Rajasthan"],["09","Uttar Pradesh"],["10","Bihar"],
  ["11","Sikkim"],["12","Arunachal Pradesh"],["13","Nagaland"],
  ["14","Manipur"],["15","Mizoram"],["16","Tripura"],["17","Meghalaya"],
  ["18","Assam"],["19","West Bengal"],["20","Jharkhand"],["21","Odisha"],
  ["22","Chhattisgarh"],["23","Madhya Pradesh"],["24","Gujarat"],
  ["27","Maharashtra"],["28","Andhra Pradesh"],["29","Karnataka"],
  ["30","Goa"],["32","Kerala"],["33","Tamil Nadu"],["34","Puducherry"],
  ["36","Telangana"],["37","Andhra Pradesh (New)"],["38","Ladakh"],
];

const now = new Date();

// ── Small helpers ──────────────────────────────────────────────────────────

function Badge({ color, children }) {
  const cls = {
    green: "bg-green-100 text-green-800",
    blue:  "bg-blue-100 text-blue-800",
    red:   "bg-red-100 text-red-800",
    gray:  "bg-gray-100 text-gray-700",
  }[color] || "bg-gray-100 text-gray-700";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

function StatCard({ label, value, sub, color = "blue" }) {
  const border = { blue: "border-blue-500", green: "border-green-500",
                   orange: "border-orange-500", red: "border-red-500" }[color];
  return (
    <div className={`bg-white rounded-xl border-l-4 ${border} shadow-sm p-4`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function fmt(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function GSTReportsPage() {
  const [tab, setTab] = useState("reports");   // "reports" | "settings"

  // period selector
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());

  // data
  const [gstr1, setGstr1]     = useState(null);
  const [gstr3b, setGstr3b]   = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // settings form
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  // load GST settings on mount
  useEffect(() => {
    apiGet("/api/gst/settings")
      .then((d) => { setSettings(d); setForm(d); })
      .catch(() => {});
  }, []);

  const loadReports = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [r1, r3b] = await Promise.all([
        apiGet(`/api/gst/gstr1?month=${month}&year=${year}`),
        apiGet(`/api/gst/gstr3b?month=${month}&year=${year}`),
      ]);
      setGstr1(r1);
      setGstr3b(r3b);
    } catch (e) {
      setError(e.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const d = await apiPost("/api/gst/settings", form);
      setSettings(d);
      setForm(d);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/gst/export?month=${month}&year=${year}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `GST_Package_${MONTHS[month - 1]}_${year}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <ShopLayout>
      <PageContainer title="GST Reports" maxWidth="max-w-5xl">
        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          {[["reports","📊 Reports"], ["settings","⚙️ GST Settings"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <InlineError message={error} onDismiss={() => setError("")} className="mb-4" />}

        {/* ═══════════════════════════════════════════════
            TAB 1 — REPORTS
        ═══════════════════════════════════════════════ */}
        {tab === "reports" && (
          <>
            {/* Period selector */}
            <SectionCard className="mb-6">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={loadReports}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Loading…" : "Load Reports"}
                </button>
                {gstr1 && (
                  <button
                    onClick={handleExport}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                  >
                    ⬇ Download for CA
                  </button>
                )}
              </div>

              {settings && !settings.gstin && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  ⚠️ GSTIN not configured. Go to <button onClick={() => setTab("settings")} className="underline font-medium">GST Settings</button> to add your store's GSTIN.
                </div>
              )}
            </SectionCard>

            {/* ── GSTR-3B Summary Cards ── */}
            {gstr3b && (
              <div className="mb-6">
                <h2 className="text-base font-semibold text-gray-800 mb-3">
                  GSTR-3B Summary — {gstr3b.period_label}
                  {gstr3b.gstin && <span className="ml-2 text-xs font-normal text-gray-500">GSTIN: {gstr3b.gstin}</span>}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <StatCard label="Total Sales" value={fmt(gstr3b.total_sales)} color="blue" />
                  <StatCard label="Total Tax Payable" value={fmt(gstr3b.total_tax_payable)} color="red" />
                  <StatCard label="B2B Sales" value={fmt(gstr3b.b2b_sales)} sub="Business customers" color="green" />
                  <StatCard label="B2C Sales" value={fmt(gstr3b.b2c_sales)} sub="Retail customers" color="orange" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <div className="text-xs text-gray-500 mb-1">CGST</div>
                    <div className="text-xl font-bold text-gray-800">{fmt(gstr3b.total_cgst)}</div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <div className="text-xs text-gray-500 mb-1">SGST</div>
                    <div className="text-xl font-bold text-gray-800">{fmt(gstr3b.total_sgst)}</div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <div className="text-xs text-gray-500 mb-1">IGST</div>
                    <div className="text-xl font-bold text-gray-800">{fmt(gstr3b.total_igst)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── GSTR-1 Details ── */}
            {gstr1 && (
              <div className="space-y-6">
                {/* B2B */}
                <SectionCard>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">B2B Invoices</h3>
                    <Badge color="blue">{gstr1.b2b.length} invoices</Badge>
                  </div>
                  {gstr1.b2b.length === 0 ? (
                    <p className="text-sm text-gray-400">No B2B invoices this month</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                            <th className="text-left py-2 pr-4">Invoice</th>
                            <th className="text-left py-2 pr-4">Date</th>
                            <th className="text-left py-2 pr-4">Customer</th>
                            <th className="text-left py-2 pr-4">GSTIN</th>
                            <th className="text-right py-2 pr-4">Taxable</th>
                            <th className="text-right py-2 pr-4">CGST</th>
                            <th className="text-right py-2 pr-4">SGST</th>
                            <th className="text-right py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gstr1.b2b.map((r, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 pr-4 font-mono text-xs">{r.invoice_number}</td>
                              <td className="py-2 pr-4">{r.invoice_date}</td>
                              <td className="py-2 pr-4">{r.customer_name}</td>
                              <td className="py-2 pr-4 font-mono text-xs">{r.customer_gstin}</td>
                              <td className="py-2 pr-4 text-right">{fmt(r.taxable_value)}</td>
                              <td className="py-2 pr-4 text-right">{fmt(r.cgst)}</td>
                              <td className="py-2 pr-4 text-right">{fmt(r.sgst)}</td>
                              <td className="py-2 text-right font-medium">{fmt(r.invoice_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>

                {/* B2C Large */}
                <SectionCard>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">B2C Large Invoices <span className="text-xs font-normal text-gray-500">(₹2.5L+)</span></h3>
                    <Badge color="orange">{gstr1.b2c_large.length} invoices</Badge>
                  </div>
                  {gstr1.b2c_large.length === 0 ? (
                    <p className="text-sm text-gray-400">No B2C large invoices this month</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                            <th className="text-left py-2 pr-4">Invoice</th>
                            <th className="text-left py-2 pr-4">Date</th>
                            <th className="text-left py-2 pr-4">Customer</th>
                            <th className="text-right py-2 pr-4">Taxable</th>
                            <th className="text-right py-2 pr-4">CGST</th>
                            <th className="text-right py-2 pr-4">SGST</th>
                            <th className="text-right py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gstr1.b2c_large.map((r, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 pr-4 font-mono text-xs">{r.invoice_number}</td>
                              <td className="py-2 pr-4">{r.invoice_date}</td>
                              <td className="py-2 pr-4">{r.customer_name}</td>
                              <td className="py-2 pr-4 text-right">{fmt(r.taxable_value)}</td>
                              <td className="py-2 pr-4 text-right">{fmt(r.cgst)}</td>
                              <td className="py-2 pr-4 text-right">{fmt(r.sgst)}</td>
                              <td className="py-2 text-right font-medium">{fmt(r.invoice_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>

                {/* B2C Small consolidated */}
                <SectionCard>
                  <h3 className="font-semibold text-gray-800 mb-3">
                    B2C Small — Consolidated <span className="text-xs font-normal text-gray-500">(under ₹2.5L, no GSTIN)</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {[
                      ["Taxable Value", gstr1.b2c_small.total_taxable_value],
                      ["CGST", gstr1.b2c_small.total_cgst],
                      ["SGST", gstr1.b2c_small.total_sgst],
                      ["Invoice Total", gstr1.b2c_small.total_invoice_value],
                    ].map(([label, val]) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">{label}</div>
                        <div className="font-semibold">{fmt(val)}</div>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                {/* HSN Summary */}
                <SectionCard>
                  <h3 className="font-semibold text-gray-800 mb-3">HSN Summary</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                          <th className="text-left py-2 pr-4">HSN</th>
                          <th className="text-left py-2 pr-4">Description</th>
                          <th className="text-right py-2 pr-4">Items</th>
                          <th className="text-right py-2 pr-4">Taxable Value</th>
                          <th className="text-right py-2 pr-4">CGST</th>
                          <th className="text-right py-2 pr-4">SGST</th>
                          <th className="text-right py-2">Total Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gstr1.hsn_summary.map((r, i) => (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 pr-4 font-mono text-xs font-semibold">{r.hsn_code}</td>
                            <td className="py-2 pr-4">{r.description}</td>
                            <td className="py-2 pr-4 text-right">{r.total_quantity}</td>
                            <td className="py-2 pr-4 text-right">{fmt(r.total_value)}</td>
                            <td className="py-2 pr-4 text-right">{fmt(r.total_cgst)}</td>
                            <td className="py-2 pr-4 text-right">{fmt(r.total_sgst)}</td>
                            <td className="py-2 text-right font-semibold text-red-700">{fmt(r.total_tax)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-300 font-bold text-gray-800">
                          <td colSpan={3} className="py-2 pr-4">Total</td>
                          <td className="py-2 pr-4 text-right">{fmt(gstr1.total_taxable_value)}</td>
                          <td className="py-2 pr-4 text-right">{fmt(gstr1.total_cgst)}</td>
                          <td className="py-2 pr-4 text-right">{fmt(gstr1.total_sgst)}</td>
                          <td className="py-2 text-right text-red-700">{fmt(gstr1.total_tax_collected)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </SectionCard>
              </div>
            )}

            {!gstr1 && !loading && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-sm">Select a month and year, then click <strong>Load Reports</strong></p>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════
            TAB 2 — GST SETTINGS
        ═══════════════════════════════════════════════ */}
        {tab === "settings" && (
          <SectionCard>
            <h2 className="text-base font-semibold text-gray-800 mb-6">Store GST Configuration</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GSTIN
                  <span className="ml-1 text-xs font-normal text-gray-400">e.g. 27AABCG1234L1ZX</span>
                </label>
                <input
                  type="text"
                  placeholder="27AABCG1234L1ZX"
                  maxLength={15}
                  value={form.gstin || ""}
                  onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <select
                  value={form.state_code || ""}
                  onChange={(e) => setForm((f) => ({ ...f, state_code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select state…</option>
                  {INDIAN_STATES.map(([code, name]) => (
                    <option key={code} value={code}>{code} — {name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Prefix
                  <span className="ml-1 text-xs font-normal text-gray-400">e.g. GP → GP/2526/001</span>
                </label>
                <input
                  type="text"
                  placeholder="GP"
                  maxLength={6}
                  value={form.invoice_prefix || ""}
                  onChange={(e) => setForm((f) => ({ ...f, invoice_prefix: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500"
                />
                {form.invoice_prefix && (
                  <p className="text-xs text-gray-400 mt-1">
                    Next invoice: <strong>{form.invoice_prefix}/2526/{String((settings?.invoice_seq_current || 0) + 1).padStart(3, "0")}</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default HSN — Gold</label>
                <input
                  type="text"
                  value={form.default_hsn_gold || "7113"}
                  onChange={(e) => setForm((f) => ({ ...f, default_hsn_gold: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default HSN — Silver</label>
                <input
                  type="text"
                  value={form.default_hsn_silver || "7114"}
                  onChange={(e) => setForm((f) => ({ ...f, default_hsn_silver: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default HSN — Making Charges</label>
                <input
                  type="text"
                  value={form.default_hsn_making || "9988"}
                  onChange={(e) => setForm((f) => ({ ...f, default_hsn_making: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Settings"}
              </button>
              {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
            </div>

            {/* GST Rate Reference */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">GST Rate Reference — Jewellery</h3>
              <table className="text-sm w-full max-w-lg">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b">
                    <th className="text-left py-2 pr-4">HSN</th>
                    <th className="text-left py-2 pr-4">Item</th>
                    <th className="text-left py-2">GST Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["7113","Gold Jewellery & Articles","3%"],
                    ["7114","Silver Jewellery & Articles","3%"],
                    ["7102","Diamond / Precious Stone Jewellery","3%"],
                    ["7108","Gold Coins & Bars","3%"],
                    ["9988","Making Charges / Job Work","5%"],
                  ].map(([hsn, desc, rate]) => (
                    <tr key={hsn} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-mono text-xs font-semibold">{hsn}</td>
                      <td className="py-2 pr-4 text-gray-700">{desc}</td>
                      <td className="py-2"><span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-semibold">{rate}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}
      </PageContainer>
    </ShopLayout>
  );
}
