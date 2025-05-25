import React from "react";

export function Select({ options = [], className = "", ...props }) {
  return (
    <select
      className={`w-full px-4 py-2 border border-gray-300 rounded-md ${className}`}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
