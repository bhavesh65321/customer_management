/**
 * Format a value as a date string (YYYY-MM-DD) or return fallback.
 * @param {string|Date|null|undefined} val
 * @param {string} fallback
 * @returns {string|null}
 */
export function formatDate(val, fallback = "—") {
  if (val == null) return fallback;
  const d = typeof val === "string" ? val.split("T")[0] : val;
  if (!d) return fallback;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d);
}

/**
 * Format a number as Indian locale currency (₹).
 * @param {number} amount
 * @param {{ minimumFractionDigits?: number }} options
 * @returns {string}
 */
export function formatCurrency(amount, options = {}) {
  const num = Number(amount);
  if (Number.isNaN(num)) return "₹0.00";
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  });
}

/**
 * Format as currency with ₹ prefix (alias for formatCurrency for readability in JSX).
 */
export function formatRupee(amount, fractionDigits = 2) {
  return formatCurrency(amount, { minimumFractionDigits: fractionDigits });
}

/**
 * Format payment/salary amount for display (₹ or — if empty).
 */
export function formatPay(value) {
  if (value == null || value === "") return "—";
  const num = Number(value);
  return Number.isNaN(num) ? "—" : `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}
