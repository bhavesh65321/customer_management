// File: frontend/src/components/AuthForm.jsx
import React from "react";
import { Link } from "react-router-dom";

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
  backgroundColor = "bg-[#ede9fe]", // default like login
}) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${backgroundColor}`}>
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        {subtitle && <p className="mb-6">{subtitle}</p>}

        <form onSubmit={onSubmit}>
          {fields.map(({ name, label, type = "text" }) => (
            <div className="mb-4" key={name}>
              <label className="block mb-1 font-medium">{label}</label>
              <input
                type={type}
                name={name}
                value={values[name] || ""}
                onChange={onChange}
                className={`w-full px-4 py-2 border border-gray-300 rounded-md`}
                required
              />
            </div>
          ))}

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

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
        </form>
      </div>
    </div>
  );
}
