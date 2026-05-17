import React from "react";

const SIZES = {
  sm:  "h-6 w-6 border-2",
  md:  "h-10 w-10 border-2",
  lg:  "h-12 w-12 border-2",
};

const COLORS = {
  blue:   "border-blue-500",
  indigo: "border-indigo-500",
  amber:  "border-amber-500",
  white:  "border-white",
};

/**
 * Spinner — shared loading indicator.
 *
 * Props:
 *   size   — "sm" | "md" | "lg"  (default: "md")
 *   color  — "blue" | "indigo" | "amber" | "white"  (default: "blue")
 *   center — bool — wraps in a centered flex div (default: false)
 */
export function Spinner({ size = "md", color = "blue", center = false }) {
  const s = SIZES[size] ?? SIZES.md;
  const c = COLORS[color] ?? COLORS.blue;
  const el = (
    <div
      className={`animate-spin rounded-full ${s} border-t-transparent ${c}`}
      aria-label="Loading"
      role="status"
    />
  );
  if (center) {
    return (
      <div className="flex justify-center items-center py-12">{el}</div>
    );
  }
  return el;
}

export default Spinner;
