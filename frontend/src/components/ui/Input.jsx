import React from "react";

const BASE = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-400";

/**
 * Input — shared form input with optional label, hint and inline error.
 *
 * Props:
 *   label      — string  — renders a label above the input
 *   hint       — string  — small helper text below
 *   error      — string  — red error text below (overrides hint)
 *   required   — bool    — adds * to label
 *   className  — extra classes applied to the <input>
 *   wrapClass  — extra classes on the outer <div>
 *   All other props passed directly to <input>
 */
export function Input({
  label,
  hint,
  error,
  required = false,
  className = "",
  wrapClass = "",
  id,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <div className={`mb-0 ${wrapClass}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`${BASE} ${error ? "border-red-400 focus:ring-red-300/20 focus:border-red-400" : ""} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
      {!error && hint && (
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}
    </div>
  );
}

export default Input;
