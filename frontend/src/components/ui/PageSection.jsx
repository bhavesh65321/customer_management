import React from "react";

/**
 * Standard page container with optional title for shop pages.
 */
export function PageContainer({ title, children, maxWidth = "max-w-4xl", className = "" }) {
  return (
    <div className={`${maxWidth} mx-auto ${className}`.trim()}>
      {title && (
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{title}</h1>
      )}
      {children}
    </div>
  );
}

/**
 * Card wrapper for sections (white bg, border, padding).
 */
export function SectionCard({ title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden ${className}`.trim()}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        </div>
      )}
      {children}
    </div>
  );
}

export default PageContainer;
