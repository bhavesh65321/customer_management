/**
 * printReceipt.js — Browser print-to-PDF utility (FE-08)
 *
 * Opens a new window with a fully-formatted receipt and triggers the
 * browser's native print dialog (File → Save as PDF on any device).
 *
 * This approach:
 *  • Requires zero new npm/pip packages
 *  • Works offline (important for shops with patchy connectivity)
 *  • Produces print-quality PDF via the OS print driver
 *  • Is WhatsApp-shareable via the Share button in mobile browsers
 *
 * Usage:
 *   import { printReceipt } from '../utils/printReceipt';
 *   printReceipt({ transaction, storeName, storeAddress });
 */

const fmtMoney = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (str) => {
  if (!str) return "";
  try {
    return new Date(str).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return str;
  }
};

/**
 * @param {object} opts
 * @param {object} opts.transaction  — Full transaction / bill object from the API
 * @param {string} opts.storeName    — Shop / store name
 * @param {string} [opts.storePhone] — Contact number to print on receipt
 * @param {string} [opts.storeAddress] — Address line
 * @param {string} [opts.gstin]      — GSTIN to print (optional)
 */
export function printReceipt({ transaction, storeName, storePhone, storeAddress, gstin }) {
  const txn = transaction || {};
  const items = Array.isArray(txn.items) ? txn.items : [];

  const itemRows = items.length
    ? items
        .map(
          (item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.description || item.name || "Item"}</td>
          <td style="text-align:right">${item.quantity ?? 1}</td>
          <td style="text-align:right">${fmtMoney(item.rate || item.unit_price || 0)}</td>
          <td style="text-align:right">${fmtMoney(item.amount || item.total || 0)}</td>
        </tr>`
        )
        .join("")
    : `<tr><td colspan="5" style="text-align:center;color:#888">No line items</td></tr>`;

  const subtotal = txn.subtotal ?? txn.grand_total ?? txn.grandTotal ?? 0;
  const tax = txn.tax_amount ?? txn.cgst_amount ?? 0;
  const discount = txn.discount_amount ?? 0;
  const grandTotal = txn.grand_total ?? txn.grandTotal ?? subtotal;
  const paid = txn.paid_amount ?? txn.amount_paid ?? grandTotal;
  const due = txn.due_amount ?? txn.balance_due ?? (grandTotal - paid);
  const invNo = txn.invoice_number ?? txn.transaction_number ?? `TXN-${txn.id ?? ""}`;
  const invDate = fmtDate(txn.created_at ?? txn.date ?? new Date().toISOString());
  const customerName = txn.customer_name ?? txn.customer?.name ?? "";
  const customerPhone = txn.customer_phone ?? txn.customer?.primary_phone ?? "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${invNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 24px; max-width: 680px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { font-size: 22px; font-weight: 800; letter-spacing: 1px; }
    .header p { font-size: 11px; color: #444; margin-top: 2px; }
    .header .gstin { font-size: 10px; color: #666; margin-top: 4px; font-weight: 600; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 16px; gap: 8px; }
    .meta-block { flex: 1; }
    .meta-block .label { font-size: 10px; text-transform: uppercase; color: #888; font-weight: 600; letter-spacing: 0.5px; }
    .meta-block .value { font-size: 13px; font-weight: 700; color: #111; margin-top: 2px; }
    .meta-block .sub { font-size: 11px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    thead tr { background: #111; color: #fff; }
    thead th { padding: 7px 8px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th:last-child, thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
    tbody tr:nth-child(even) { background: #f9f9f9; }
    tbody td { padding: 7px 8px; font-size: 12px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
    .totals { width: 260px; margin-left: auto; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
    .totals table { margin-bottom: 0; }
    .totals tbody td { border-bottom: 1px solid #eee; padding: 6px 12px; }
    .totals tbody tr:last-child td { border-bottom: none; }
    .grand-total td { background: #111; color: #fff; font-weight: 700; font-size: 14px; }
    .due td { background: #fee2e2; color: #b91c1c; font-weight: 700; }
    .paid-label { background: #dcfce7; color: #15803d; }
    .footer { text-align: center; margin-top: 20px; padding-top: 12px; border-top: 1px dashed #ccc; font-size: 11px; color: #666; }
    @media print {
      body { padding: 0; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${storeName || "Invoice"}</h1>
    ${storeAddress ? `<p>${storeAddress}</p>` : ""}
    ${storePhone ? `<p>📞 ${storePhone}</p>` : ""}
    ${gstin ? `<p class="gstin">GSTIN: ${gstin}</p>` : ""}
  </div>

  <div class="meta">
    <div class="meta-block">
      <div class="label">Invoice No</div>
      <div class="value">${invNo}</div>
      <div class="sub">${invDate}</div>
    </div>
    <div class="meta-block" style="text-align:right">
      <div class="label">Customer</div>
      <div class="value">${customerName || "—"}</div>
      <div class="sub">${customerPhone}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:32px">#</th>
        <th>Description</th>
        <th style="text-align:right;width:60px">Qty</th>
        <th style="text-align:right;width:90px">Rate</th>
        <th style="text-align:right;width:90px">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tbody>
        ${discount > 0 ? `<tr><td>Subtotal</td><td style="text-align:right">${fmtMoney(subtotal + discount)}</td></tr>
        <tr><td>Discount</td><td style="text-align:right; color:#15803d">−${fmtMoney(discount)}</td></tr>` : ""}
        ${tax > 0 ? `<tr><td>Tax</td><td style="text-align:right">${fmtMoney(tax)}</td></tr>` : ""}
        <tr class="grand-total"><td>Total</td><td style="text-align:right">${fmtMoney(grandTotal)}</td></tr>
        <tr class="${paid > 0 ? "paid-label" : ""}"><td>Paid</td><td style="text-align:right">${fmtMoney(paid)}</td></tr>
        ${due > 0.01 ? `<tr class="due"><td>Balance Due</td><td style="text-align:right">${fmtMoney(due)}</td></tr>` : ""}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Thank you for your business! 🙏<br/>
    ${storePhone ? `For queries, call ${storePhone}` : ""}
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=780,height=900");
  if (!win) {
    alert("Please allow pop-ups for this site to print invoices.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
