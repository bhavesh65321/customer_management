import React from "react";

export function Button({ children, className = "", ...props }) {
  return (
    <button
      className={`px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition text-sm font-medium ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
