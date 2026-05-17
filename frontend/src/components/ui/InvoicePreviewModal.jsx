import React from "react";
import InlineError from "./InlineError";
import { Spinner } from "./Spinner";
import { authHeaders, API_BASE } from "../../api";
import { parseApiError } from "../../utils/apiError";

/**
 * Slide-over / modal that shows the invoice preview and handles
 * print + PDF download.
 *
 * Props:
 *   isOpen              — bool
 *   onClose             — () => void
 *   transactionId       — number | null
 *   invoiceData         — object | null  (from /api/transactions/invoice/:id)
 *   loading             — bool
 *   error               — string
 *   onErrorDismiss      — () => void
 *   t                   — translation function
 */
const InvoicePreviewModal = ({
  isOpen,
  onClose,
  transactionId,
  invoiceData,
  loading,
  error,
  onErrorDismiss,
  t,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    if (!invoiceData?.transaction) return;
    const txn = invoiceData.transaction;
    const d = invoiceData;
    const products = txn.products || [];
    const fmt = (v) =>
      Number(v || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    const inr = (v) => `₹\u00a0${fmt(v)}`;
    const fmtDate = (s) =>
      s
        ? new Date(s).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "-";
    const fmtTime = (s) =>
      s
        ? new Date(s).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : "";
    const invoiceLabel =
      txn.gstComputed && txn.hsnCode ? "TAX INVOICE" : "PURCHASE ORDER";
    const invNo = txn.invoiceNumber || `#${txn.id}`;
    const due = Number(txn.dueAmount || 0);
    const paid = Number(txn.paidAmount || 0);
    const badgeColor =
      due <= 0 ? "#1B6B3A" : paid <= 0 ? "#C0392B" : "#E67E22";
    const badgeText =
      due <= 0 ? "✓ FULLY PAID" : paid <= 0 ? "PAYMENT PENDING" : "PARTIALLY PAID";

    const productRows = products
      .map((p, i) => {
        const diamond = Number(p.diamondCharge || 0);
        const extras = [];
        if (p.qty && Number(p.qty) !== 1) extras.push(`Qty: ${p.qty}`);
        if (diamond > 0) extras.push(`Diamond: ${inr(diamond)}`);
        return `
        <tr class="${i % 2 === 0 ? "row-alt" : ""}">
          <td class="center">${i + 1}</td>
          <td><strong>${p.productName || "-"}</strong>${
          extras.length
            ? `<br/><small class="muted">${extras.join(" &bull; ")}</small>`
            : ""
        }</td>
          <td class="center">${(p.metalType || "").charAt(0).toUpperCase() + (p.metalType || "").slice(1)}</td>
          <td class="right">${p.weight != null ? Number(p.weight).toFixed(3) : "-"}</td>
          <td class="right">${p.rate != null ? inr(p.rate) : "-"}</td>
          <td class="right">${p.makingCharge != null ? inr(p.makingCharge) : "-"}</td>
          <td class="right bold">${p.total != null ? inr(p.total) : "-"}</td>
        </tr>`;
      })
      .join("");

    let gstBlock = "";
    if (txn.gstComputed) {
      const totalCgst =
        Number(txn.cgstAmount || 0) + Number(txn.makingCgst || 0);
      const totalSgst =
        Number(txn.sgstAmount || 0) + Number(txn.makingSgst || 0);
      const totalGst = totalCgst + totalSgst;
      gstBlock = `
        <tr><td class="lbl">Taxable Value</td><td class="right">${inr(txn.taxableValue)}</td></tr>
        ${txn.makingCharges > 0 ? `<tr><td class="lbl">Making Charges</td><td class="right">${inr(txn.makingCharges)}</td></tr>` : ""}
        ${!txn.isInterstate && totalCgst > 0 ? `<tr><td class="lbl">CGST (${Number(txn.taxRate || 3) / 2}%)</td><td class="right">${inr(totalCgst)}</td></tr>` : ""}
        ${!txn.isInterstate && totalSgst > 0 ? `<tr><td class="lbl">SGST (${Number(txn.taxRate || 3) / 2}%)</td><td class="right">${inr(totalSgst)}</td></tr>` : ""}
        ${totalGst > 0 ? `<tr class="subtotal-row"><td class="lbl bold">Total GST</td><td class="right bold">${inr(totalGst)}</td></tr>` : ""}`;
    }

    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>${invoiceLabel} ${invNo}</title>
    <meta charset="utf-8"/>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:13px;color:#1A1A2E;background:#fff;padding:30px;}
      .page{max-width:780px;margin:0 auto;}
      .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;}
      .store-name{font-size:22px;font-weight:700;color:#1A1A2E;margin-bottom:4px;}
      .store-meta{font-size:11px;color:#555;line-height:1.6;}
      .inv-title{font-size:24px;font-weight:800;color:#C9A84C;text-align:right;margin-bottom:6px;}
      .inv-meta{font-size:11px;text-align:right;line-height:1.8;color:#333;}
      .inv-meta strong{color:#1A1A2E;}
      .gold-rule{border:none;border-top:2.5px solid #C9A84C;margin:14px 0;}
      .bill-section{margin-bottom:16px;}
      .bill-label{font-size:9px;font-weight:700;color:#C9A84C;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;}
      .bill-name{font-size:16px;font-weight:700;color:#1A1A2E;}
      .bill-meta{font-size:11px;color:#555;margin-top:2px;}
      table.products{width:100%;border-collapse:collapse;margin-top:6px;}
      table.products thead tr{background:#1A1A2E;color:#fff;}
      table.products th{padding:8px 10px;font-size:11px;font-weight:600;text-align:left;white-space:nowrap;}
      table.products th.right,table.products td.right{text-align:right;}
      table.products th.center,table.products td.center{text-align:center;}
      table.products td{padding:7px 10px;font-size:12px;border-bottom:1px solid #E8E0D0;vertical-align:middle;}
      table.products tr.row-alt td{background:#F5F0E8;}
      table.products td.bold{font-weight:700;}
      small.muted{color:#888;font-size:10px;}
      .summary-wrap{display:flex;justify-content:flex-end;margin-top:18px;}
      table.summary{border-collapse:collapse;min-width:280px;}
      table.summary td{padding:5px 10px;font-size:13px;border-bottom:1px solid #E8E0D0;}
      table.summary td.lbl{text-align:right;color:#555;}
      table.summary td.right{text-align:right;}
      table.summary td.bold{font-weight:700;color:#1A1A2E;}
      table.summary tr.grand td{font-size:15px;font-weight:800;border-top:2px solid #C9A84C;border-bottom:2px solid #C9A84C;color:#1A1A2E;}
      table.summary tr.paid-row td{color:#1B6B3A;font-weight:700;}
      table.summary tr.due-row td{color:${due > 0 ? "#C0392B" : "#555"};font-weight:700;}
      table.summary tr.subtotal-row td{font-weight:700;border-top:1px solid #C9A84C;}
      .badge{display:inline-block;padding:5px 16px;border-radius:4px;font-size:11px;font-weight:700;color:#fff;background:${badgeColor};margin-top:14px;letter-spacing:.5px;}
      .footer{margin-top:32px;border-top:1px solid #C9A84C;padding-top:14px;display:flex;justify-content:space-between;}
      .footer-terms{font-size:10px;color:#888;line-height:1.7;}
      .footer-terms strong{color:#555;display:block;margin-bottom:2px;}
      .footer-right{text-align:right;font-size:11px;color:#555;}
      .footer-right .thanks{font-size:13px;font-weight:700;color:#C9A84C;margin-bottom:8px;}
      .footer-right .sig{margin-top:24px;border-top:1px solid #ccc;padding-top:4px;font-size:10px;color:#aaa;}
      @media print{body{padding:10px;}@page{margin:10mm;}}
    </style>
    </head><body><div class="page">
      <div class="header">
        <div>
          <div class="store-name">${d.storeName || "Jewellery Store"}</div>
          <div class="store-meta">
            ${d.storeAddress ? `${d.storeAddress}<br/>` : ""}
            ${d.storePhone ? `Ph: ${d.storePhone}` : ""}${d.storePhone && d.storeEmail ? " &nbsp;|&nbsp; " : ""}${d.storeEmail || ""}
            ${d.storeGstin ? `<br/>GSTIN: ${d.storeGstin}` : ""}
          </div>
        </div>
        <div>
          <div class="inv-title">${invoiceLabel}</div>
          <div class="inv-meta">
            <strong>Invoice No:</strong> ${invNo}<br/>
            <strong>Date:</strong> ${fmtDate(txn.date)}<br/>
            <strong>Time:</strong> ${fmtTime(txn.date)}<br/>
            ${txn.billType ? `<strong>Type:</strong> ${txn.billType}<br/>` : ""}
            ${txn.paymentMode ? `<strong>Payment:</strong> ${txn.paymentMode}` : ""}
          </div>
        </div>
      </div>
      <hr class="gold-rule"/>
      <div class="bill-section">
        <div class="bill-label">Bill To</div>
        <div class="bill-name">${txn.customerName}</div>
        ${txn.customerGstin ? `<div class="bill-meta">GSTIN: ${txn.customerGstin}</div>` : ""}
      </div>
      <table class="products">
        <thead>
          <tr>
            <th style="width:32px">Sr.</th>
            <th>Item Description</th>
            <th class="center" style="width:60px">Metal</th>
            <th class="right" style="width:70px">Wt&nbsp;(g)</th>
            <th class="right" style="width:90px">Rate/g</th>
            <th class="right" style="width:90px">Making</th>
            <th class="right" style="width:100px">Amount</th>
          </tr>
        </thead>
        <tbody>${productRows}</tbody>
      </table>
      <div class="summary-wrap">
        <table class="summary">
          ${gstBlock}
          <tr class="grand"><td class="lbl bold">Grand Total</td><td class="right bold">${inr(txn.grandTotal)}</td></tr>
          <tr class="paid-row"><td class="lbl">Amount Paid</td><td class="right">${inr(txn.paidAmount)}</td></tr>
          <tr class="due-row"><td class="lbl">Balance Due</td><td class="right">${inr(txn.dueAmount)}</td></tr>
        </table>
      </div>
      <div><span class="badge">${badgeText}</span></div>
      <div class="footer">
        <div class="footer-terms">
          <strong>Terms &amp; Conditions</strong>
          • All disputes subject to local jurisdiction.<br/>
          • Goods once sold will not be taken back.<br/>
          • This is a computer-generated document.
        </div>
        <div class="footer-right">
          <div class="thanks">Thank you for your business!</div>
          <div><strong>${d.storeName || ""}</strong></div>
          <div class="sig">Authorised Signatory</div>
        </div>
      </div>
    </div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  const handleDownloadPdf = async () => {
    if (!transactionId) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/transactions/invoice/${transactionId}/pdf`,
        { headers: authHeaders() }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(parseApiError(errData, "Failed to download PDF. Please try again."));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `purchase-order-${transactionId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
    }
  };

  const txn = invoiceData?.transaction;
  const d = invoiceData;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-700 tracking-wide uppercase">
            Invoice Preview
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none p-1"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="px-6 pt-2 flex-shrink-0">
            <InlineError message={error} onDismiss={onErrorDismiss} />
          </div>
        )}

        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" color="amber" center />
            </div>
          ) : txn ? (
            <InvoiceBody txn={txn} d={d} />
          ) : (
            <p className="text-gray-500 text-center py-8">
              {t ? t("customer.couldNotLoadInvoice") : "Could not load invoice."}
            </p>
          )}
        </div>

        {txn && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              🖨 Print
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              ⬇ Download PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/** Pure presentational — renders the invoice content inside the modal */
function InvoiceBody({ txn, d }) {
  const ifmt = (v) =>
    Number(v || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const iinr = (v) => `₹\u00a0${ifmt(v)}`;
  const fmtD = (s) =>
    s
      ? new Date(s).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "-";
  const fmtT = (s) =>
    s
      ? new Date(s).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : "";

  const invLabel =
    txn.gstComputed && txn.hsnCode ? "TAX INVOICE" : "PURCHASE ORDER";
  const invNo = txn.invoiceNumber || `#${txn.id}`;
  const idue = Number(txn.dueAmount || 0);
  const ipaid = Number(txn.paidAmount || 0);
  const prods = txn.products || [];

  return (
    <div className="font-sans text-sm text-gray-800">
      {/* Store + invoice header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xl font-bold text-gray-900">{d?.storeName || "Jewellery Store"}</p>
          {d?.storeAddress && <p className="text-xs text-gray-500 mt-0.5">{d.storeAddress}</p>}
          <p className="text-xs text-gray-500">
            {d?.storePhone && `Ph: ${d.storePhone}`}
            {d?.storePhone && d?.storeEmail && " · "}
            {d?.storeEmail}
          </p>
          {d?.storeGstin && <p className="text-xs text-gray-500">GSTIN: {d.storeGstin}</p>}
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold text-amber-600 tracking-wide">{invLabel}</p>
          <p className="text-xs text-gray-600 mt-1">
            <span className="font-semibold text-gray-800">Invoice No:</span> {invNo}
          </p>
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-gray-800">Date:</span> {fmtD(txn.date)}{" "}
            {fmtT(txn.date)}
          </p>
          {txn.billType && (
            <p className="text-xs text-gray-600">
              <span className="font-semibold text-gray-800">Type:</span> {txn.billType}
            </p>
          )}
          {txn.paymentMode && (
            <p className="text-xs text-gray-600">
              <span className="font-semibold text-gray-800">Payment:</span> {txn.paymentMode}
            </p>
          )}
        </div>
      </div>

      <div className="my-3 border-t-2 border-amber-500" />

      {/* Bill to */}
      <div className="mb-4">
        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">
          Bill To
        </p>
        <p className="text-base font-bold text-gray-900">{txn.customerName}</p>
        {txn.customerGstin && (
          <p className="text-xs text-gray-500">GSTIN: {txn.customerGstin}</p>
        )}
      </div>

      {/* Products table */}
      <div className="overflow-x-auto rounded-lg border border-amber-200">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-2 py-2.5 text-center text-gray-500 font-semibold w-8">Sr.</th>
              <th className="px-3 py-2.5 text-left text-gray-500 font-semibold">Item Description</th>
              <th className="px-2 py-2.5 text-center text-gray-500 font-semibold">Metal</th>
              <th className="px-2 py-2.5 text-right text-gray-500 font-semibold">Wt (g)</th>
              <th className="px-2 py-2.5 text-right text-gray-500 font-semibold">Rate/g</th>
              <th className="px-2 py-2.5 text-right text-gray-500 font-semibold">Making</th>
              <th className="px-3 py-2.5 text-right text-gray-500 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {prods.map((p, i) => {
              const diam = Number(p.diamondCharge || 0);
              return (
                <tr key={p.id || i} className={i % 2 === 0 ? "bg-amber-50/40" : "bg-white"}>
                  <td className="px-2 py-2 text-center text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2">
                    <span className="font-semibold text-gray-800">{p.productName || "-"}</span>
                    {((p.qty && Number(p.qty) !== 1) || diam > 0) && (
                      <span className="block text-[10px] text-gray-400 mt-0.5">
                        {p.qty && Number(p.qty) !== 1 && `Qty: ${p.qty}`}
                        {p.qty && Number(p.qty) !== 1 && diam > 0 && " · "}
                        {diam > 0 && `Diamond: ${iinr(diam)}`}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center text-gray-600 capitalize">{p.metalType || "-"}</td>
                  <td className="px-2 py-2 text-right text-gray-700">
                    {p.weight != null ? Number(p.weight).toFixed(3) : "-"}
                  </td>
                  <td className="px-2 py-2 text-right text-gray-700">
                    {p.rate != null ? iinr(p.rate) : "-"}
                  </td>
                  <td className="px-2 py-2 text-right text-gray-700">
                    {p.makingCharge != null ? iinr(p.makingCharge) : "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-gray-900">
                    {p.total != null ? iinr(p.total) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex justify-end mt-4">
        <div className="w-64 space-y-1">
          <div className="flex justify-between font-bold text-base border-t-2 border-b-2 border-amber-500 py-1.5">
            <span className="text-gray-900">Grand Total</span>
            <span className="text-gray-900">{iinr(txn.grandTotal)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-green-700 pt-0.5">
            <span>Amount Paid</span>
            <span>{iinr(txn.paidAmount)}</span>
          </div>
          <div
            className={`flex justify-between text-sm font-semibold ${
              idue > 0 ? "text-red-600" : "text-gray-500"
            }`}
          >
            <span>Balance Due</span>
            <span>{iinr(txn.dueAmount)}</span>
          </div>
        </div>
      </div>

      {/* Badge */}
      <div className="mt-4">
        {idue <= 0 ? (
          <span className="inline-flex px-3 py-1 rounded text-xs font-bold bg-green-700 text-white">
            ✓ FULLY PAID
          </span>
        ) : ipaid <= 0 ? (
          <span className="inline-flex px-3 py-1 rounded text-xs font-bold bg-red-600 text-white">
            PAYMENT PENDING
          </span>
        ) : (
          <span className="inline-flex px-3 py-1 rounded text-xs font-bold bg-orange-500 text-white">
            PARTIALLY PAID
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-amber-300 flex justify-between items-end">
        <div className="text-[10px] text-gray-400 space-y-0.5">
          <p className="font-semibold text-gray-500">Terms &amp; Conditions</p>
          <p>• All disputes subject to local jurisdiction.</p>
          <p>• Goods once sold will not be taken back.</p>
          <p>• Computer-generated document.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-amber-600">Thank you for your business!</p>
          <p className="text-xs text-gray-600 mt-4 border-t border-gray-300 pt-1">
            Authorised Signatory
          </p>
        </div>
      </div>
    </div>
  );
}

export default InvoicePreviewModal;
