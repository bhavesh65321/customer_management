import React from "react";
import { Link } from "react-router-dom";
import InlineError from "./InlineError";

export default function AuthForm({
  title,
  subtitle,
  fields,
  values,
  onChange,
  onSubmit,
  submitLabel,
  error,
  footerText,
  footerLinkText,
  footerLinkTo,
  extraFooter,
  backgroundColor = "bg-[#ede9fe]", // default like login
}) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${backgroundColor}`}>
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        {subtitle && <p className="mb-6">{subtitle}</p>}

        <form onSubmit={onSubmit}>
          {fields.map(({ name, label, type = "text", options, required = true }) => (
            <div className="mb-4" key={name}>
              <label className="block mb-1 font-medium">{label}</label>
              {type === "select" && options ? (
                <select
                  name={name}
                  value={values[name] ?? ""}
                  onChange={onChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  required={!!required}
                >
                  <option value="">—</option>
                  {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={type}
                  name={name}
                  value={values[name] || ""}
                  onChange={onChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  required={!!required}
                />
              )}
            </div>
          ))}

          {error && <InlineError message={error} className="mb-4" />}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            {submitLabel}
          </button>

          <p className="text-center text-sm mt-4">
            {footerText}{" "}
            <Link to={footerLinkTo} className="text-blue-500 hover:underline">
              {footerLinkText}
            </Link>
          </p>
          {extraFooter}
        </form>
      </div>
    </div>
  );
}
