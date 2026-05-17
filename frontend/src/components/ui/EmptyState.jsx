import React from "react";

/**
 * EmptyState — centered empty state message.
 * Drop-in replacement for:
 *   <div className="text-center py-16 text-gray-400">No records found</div>
 *
 * Props:
 *   message  — string  (default: "No data found.")
 *   icon     — string emoji or JSX icon (default: "📭")
 *   action   — JSX element — optional CTA button below message
 *   className — extra classes on the wrapper
 */
export function EmptyState({ message = "No data found.", icon = "📭", action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <span className="text-4xl mb-3" aria-hidden="true">{icon}</span>
      <p className="text-gray-400 text-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
