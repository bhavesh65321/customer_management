import React from "react";

const VARIANTS = {
  primary:   "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent",
  danger:    "bg-red-600 hover:bg-red-700 text-white border-transparent",
  success:   "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent",
  warning:   "bg-amber-500 hover:bg-amber-600 text-white border-transparent",
  ghost:     "bg-white hover:bg-gray-50 text-gray-700 border-gray-200",
  outline:   "bg-transparent hover:bg-indigo-50 text-indigo-600 border-indigo-300",
};

const SIZES = {
  xs:  "px-2.5 py-1 text-xs rounded-lg",
  sm:  "px-3 py-1.5 text-sm rounded-lg",
  md:  "px-4 py-2.5 text-sm rounded-xl",
  lg:  "px-5 py-3 text-base rounded-xl",
  full:"w-full px-4 py-3 text-sm rounded-xl",
};

/**
 * Button — shared button component.
 *
 * Props:
 *   variant  — "primary" | "danger" | "success" | "warning" | "ghost" | "outline"  (default: "primary")
 *   size     — "xs" | "sm" | "md" | "lg" | "full"  (default: "md")
 *   loading  — bool — shows spinner + disables button
 *   loadingText — string shown while loading (default: "…")
 *   className — extra classes
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  className = "",
  disabled,
  ...props
}) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1";
  const v = VARIANTS[variant] ?? VARIANTS.primary;
  const s = SIZES[size] ?? SIZES.md;

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${v} ${s} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

export default Button;
