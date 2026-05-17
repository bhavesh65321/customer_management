import React from "react";

const PAYMENT_MODES = [
  { id: "cash",   label: "💵", name: "Cash" },
  { id: "upi",    label: "📱", name: "UPI" },
  { id: "card",   label: "💳", name: "Card" },
  { id: "credit", label: "📒", name: "Credit" },
];

/**
 * Modal dialog for collecting a partial or full payment against a transaction.
 *
 * Props:
 *   tx           — transaction object (with dueAmount, paidAmount, products, id)
 *   onClose      — () => void
 *   onSubmit     — (amount, mode) => Promise<void>
 *   loading      — bool
 *   error        — string | null
 *   inrFmt       — (value) => string formatter
 */
const CollectPaymentModal = ({ tx, onClose, onSubmit, loading, error, inrFmt }) => {
  const [amount, setAmount] = React.useState("");
  const [mode, setMode] = React.useState("cash");

  if (!tx) return null;

  const quickOptions = [
    { label: "Full due",  val: tx.dueAmount },
    { label: "₹5,000",   val: Math.min(5000,  tx.dueAmount) },
    { label: "₹10,000",  val: Math.min(10000, tx.dueAmount) },
    { label: "Half",     val: tx.dueAmount / 2 },
  ]
    .filter((c) => c.val > 0 && c.val <= tx.dueAmount)
    .filter((c, i, a) => a.findIndex((x) => x.val === c.val) === i);

  const handleSubmit = () => onSubmit(parseFloat(amount), mode);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-gray-900 text-base">Collect Payment</p>
            <p className="text-xs text-gray-500 mt-0.5">
              #{tx.id} · {tx.products?.map((p) => p.productName).join(", ") || "Transaction"}
            </p>
            <p className="text-xs text-red-500 font-semibold mt-0.5">
              Due: {inrFmt(tx.dueAmount)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none p-1"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Quick amount chips */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Quick amount
            </p>
            <div className="flex gap-2 flex-wrap">
              {quickOptions.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setAmount(String(Math.round(c.val)))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    parseFloat(amount) === Math.round(c.val)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount input */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Amount (₹) <span className="text-red-400">*</span>
            </p>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Max ${inrFmt(tx.dueAmount)}`}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Payment mode */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Payment mode
            </p>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all flex flex-col items-center gap-0.5 ${
                    mode === m.id
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <span className="text-base">{m.label}</span>
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !amount}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {loading ? "Saving…" : `Collect ${amount ? inrFmt(parseFloat(amount)) : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CollectPaymentModal;
