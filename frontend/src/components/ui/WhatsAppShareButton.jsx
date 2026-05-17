/**
 * WhatsAppShareButton.jsx — WhatsApp share button (FE-09)
 *
 * Opens the native WhatsApp share sheet (mobile) or web.whatsapp.com (desktop)
 * with a pre-filled message for the customer.
 *
 * Usage examples:
 *
 *   // Basic — just a payment reminder
 *   <WhatsAppShareButton phone="9876543210" message="Your bill is ready." />
 *
 *   // With invoice details auto-built
 *   <WhatsAppShareButton
 *     phone={customer.primary_phone}
 *     invoiceNumber="INV-2024-001"
 *     amount={2500}
 *     storeName="Shree Jewellers"
 *     dueAmount={500}
 *   />
 *
 *   // Custom label / icon
 *   <WhatsAppShareButton phone="..." message="..." label="Send on WhatsApp" size="lg" />
 */
import React from "react";

/**
 * Normalise an Indian phone number to the format wa.me expects:
 *   91XXXXXXXXXX  (country code + 10 digits, no + or spaces)
 */
function normalisePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits; // pass through as-is if format is unknown
}

/**
 * Build the default message when no explicit `message` prop is passed.
 */
function buildMessage({ storeName, invoiceNumber, amount, dueAmount }) {
  const parts = [];
  if (storeName) parts.push(`*${storeName}*`);
  if (invoiceNumber) parts.push(`Invoice: ${invoiceNumber}`);
  if (amount != null) {
    parts.push(`Amount: ₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);
  }
  if (dueAmount != null && dueAmount > 0.01) {
    parts.push(`Balance due: ₹${Number(dueAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);
  }
  parts.push("Thank you for shopping with us! 🙏");
  return parts.join("\n");
}

const SIZE_CLASSES = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-2.5 text-base",
};

export default function WhatsAppShareButton({
  phone,
  message,
  storeName,
  invoiceNumber,
  amount,
  dueAmount,
  label = "WhatsApp",
  size = "md",
  className = "",
}) {
  const normalisedPhone = normalisePhone(phone);

  const handleClick = (e) => {
    e.stopPropagation(); // prevent row-click handlers on parent tables

    const text = message || buildMessage({ storeName, invoiceNumber, amount, dueAmount });
    const encoded = encodeURIComponent(text);

    // wa.me works on both mobile (opens native app) and desktop (opens web.whatsapp.com)
    const url = normalisedPhone
      ? `https://wa.me/${normalisedPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={normalisedPhone ? `Send WhatsApp to ${phone}` : "Share on WhatsApp"}
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-lg
        bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#17a34a]
        text-white transition-colors shadow-sm
        disabled:opacity-50 disabled:cursor-not-allowed
        ${SIZE_CLASSES[size] || SIZE_CLASSES.md}
        ${className}
      `.trim()}
    >
      {/* WhatsApp SVG icon */}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}
        aria-hidden="true"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      {label}
    </button>
  );
}
