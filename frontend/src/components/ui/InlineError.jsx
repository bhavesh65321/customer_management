import React from "react";

const INLINE_ERROR_CLASS =
  "p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100";

export default function InlineError({ message, onDismiss, className = "" }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={`${INLINE_ERROR_CLASS} ${className}`.trim()}
    >
      <div className="flex items-start gap-2">
        <span className="flex-1">{message}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex-shrink-0 text-red-500 hover:text-red-700 focus:outline-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export { INLINE_ERROR_CLASS };
