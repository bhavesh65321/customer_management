/**
 * GSTPanel — Live GST preview on the billing screen.
 *
 * Usage:
 *   <GSTPanel
 *     itemValue={grandTotal}
 *     gstData={gstData}
 *     onChange={setGstData}
 *     preview={previewResult}
 *     loading={previewLoading}
 *   />
 *
 * Parent controls:
 *   gstData   = { enabled, hsn_code, making_charges, is_interstate, customer_gstin }
 *   onChange  = fn(patch) — merges patch into gstData
 *   preview   = API result from GET /api/gst/calculate
 */

import React from "react";

const HSN_OPTIONS = [
  { value: "7113", label: "7113 — Gold Jewellery (3%)" },
  { value: "7114", label: "7114 — Silver Jewellery (3%)" },
  { value: "7102", label: "7102 — Diamond Jewellery (3%)" },
  { value: "7108", label: "7108 — Gold Coins / Bars (3%)" },
  { value: "9988", label: "9988 — Making Charges / Job Work (5%)" },
];

function Row({ label, value, highlight }) {
  return (
    <div className={`flex justify-between py-1 text-sm ${highlight ? "font-semibold text-gray-900" : "text-gray-600"}`}>
      <span>{label}</span>
      <span>₹{Number(value || 0).toFixed(2)}</span>
    </div>
  );
}

export default function GSTPanel({ itemValue, gstData, onChange, preview, loading }) {
  if (!gstData.enabled) {
    return (
      <div className="mt-4 p-3 border border-dashed border-gray-300 rounded-lg">
        <button
          type="button"
          onClick={() => onChange({ enabled: true })}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          + Add GST to this bill
        </button>
      </div>
    );
  }

  const isInter = gstData.is_interstate;

  return (
    <div className="mt-4 border border-blue-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-blue-50 px-4 py-2 border-b border-blue-200">
        <span className="text-sm font-semibold text-blue-800">GST Details</span>
        <button
          type="button"
          onClick={() => onChange({ enabled: false })}
          className="text-xs text-gray-500 hover:text-red-500"
        >
          Remove GST
        </button>
      </div>

      <div className="p-4 space-y-4 bg-white">
        {/* Row 1 — HSN + Making charges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              HSN Code <span className="text-gray-400">(item type)</span>
            </label>
            <select
              value={gstData.hsn_code}
              onChange={(e) => onChange({ hsn_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              {HSN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Making Charges (₹) <span className="text-gray-400">HSN 9988 → 5%</span>
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={gstData.making_charges}
              onChange={(e) => onChange({ making_charges: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Row 2 — Customer GSTIN + Interstate toggle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Customer GSTIN <span className="text-gray-400">(optional — B2B only)</span>
            </label>
            <input
              type="text"
              placeholder="27AABCG1234L1ZX"
              maxLength={15}
              value={gstData.customer_gstin}
              onChange={(e) => onChange({ customer_gstin: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end pb-1">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => onChange({ is_interstate: !isInter })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  isInter ? "bg-orange-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isInter ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Inter-state sale</div>
                <div className="text-xs text-gray-400">
                  {isInter ? "→ IGST applied" : "→ CGST + SGST applied"}
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* GST Breakdown Preview */}
        {loading && (
          <div className="text-xs text-gray-400 animate-pulse">Calculating GST…</div>
        )}

        {preview && !loading && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Tax Breakdown
            </div>

            <Row label={`Item value (HSN ${preview.hsn_code})`} value={preview.taxable_value} />
            <Row label={`Making charges (HSN ${preview.making_hsn_code})`} value={preview.making_charges} />

            <div className="my-1 border-t border-gray-200" />

            {isInter ? (
              <>
                <Row label={`IGST ${preview.tax_rate}% on item`} value={preview.igst_amount - preview.making_igst} />
                <Row label={`IGST 5% on making`} value={preview.making_igst} />
                <Row label="Total IGST" value={preview.igst_amount} />
              </>
            ) : (
              <>
                <Row label={`CGST ${preview.tax_rate / 2}% on item`}
                  value={(preview.cgst_amount - preview.making_cgst).toFixed(2)} />
                <Row label={`SGST ${preview.tax_rate / 2}% on item`}
                  value={(preview.sgst_amount - preview.making_sgst).toFixed(2)} />
                {preview.making_charges > 0 && (
                  <>
                    <Row label="CGST 2.5% on making" value={preview.making_cgst} />
                    <Row label="SGST 2.5% on making" value={preview.making_sgst} />
                  </>
                )}
              </>
            )}

            <div className="my-1 border-t border-gray-200" />

            <Row label="Total Tax" value={preview.total_tax} highlight />
            <Row
              label="Grand Total (incl. GST)"
              value={preview.grand_total}
              highlight
            />

            <div className="mt-2 text-xs text-gray-400">
              {isInter
                ? "Inter-state: full IGST applied"
                : "Intra-state: CGST + SGST split equally"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
