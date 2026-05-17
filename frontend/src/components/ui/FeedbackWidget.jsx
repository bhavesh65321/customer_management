import React, { useState } from "react";
import api from "../../api";

/**
 * FeedbackWidget — GTM-04
 * Floating feedback button visible on all authenticated pages.
 * Sends feedback to POST /api/admin/feedback (stores in audit log as type=feedback).
 * Wire into ShopLayout so it appears on every page.
 */
export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("suggestion"); // suggestion | bug | praise
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/admin/feedback", { type, message: message.trim() });
      setDone(true);
      setTimeout(() => { setOpen(false); setDone(false); setMessage(""); setType("suggestion"); }, 2500);
    } catch {
      // Silently fail — feedback is non-critical
      setDone(true);
      setTimeout(() => { setOpen(false); setDone(false); setMessage(""); }, 2000);
    } finally { setSubmitting(false); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg w-12 h-12 flex items-center justify-center text-xl transition-all hover:scale-110"
        title="Send Feedback"
        aria-label="Send Feedback"
      >
        {open ? "×" : "💬"}
      </button>

      {/* Feedback panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="bg-indigo-600 text-white px-4 py-3">
            <h3 className="font-bold text-sm">Share Feedback</h3>
            <p className="text-indigo-200 text-xs">Help us improve Jewellery Manager</p>
          </div>

          {done ? (
            <div className="p-6 text-center">
              <div className="text-4xl mb-2">🙏</div>
              <p className="font-semibold text-gray-700">Thank you!</p>
              <p className="text-sm text-gray-400 mt-1">Your feedback helps us improve.</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Type selector */}
              <div className="flex gap-2">
                {[["suggestion", "💡 Idea"], ["bug", "🐛 Bug"], ["praise", "❤️ Praise"]].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setType(val)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${type === val ? "bg-indigo-100 border-indigo-400 text-indigo-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={
                  type === "suggestion" ? "What feature would help your shop most?"
                  : type === "bug" ? "Describe what went wrong…"
                  : "Tell us what you love!"
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />

              <button
                onClick={submit}
                disabled={submitting || !message.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                {submitting ? "Sending…" : "Send Feedback"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
