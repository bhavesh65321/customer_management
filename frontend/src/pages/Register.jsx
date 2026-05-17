import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import InlineError from "../components/ui/InlineError";
import { Button } from "../components/ui/Button";
import { API_BASE } from "../api";
import { parseApiError, friendlyAuthError } from "../utils/apiError";

// ─── small helpers ────────────────────────────────────────────────────────────

function Field({ label, name, type = "text", value, onChange, autoFilled, required = true, placeholder }) {
  return (
    <div className="mb-4">
      <label className="block mb-1 text-sm font-medium text-gray-700">
        {label}
        {!required && <span className="ml-1 text-xs text-gray-400">(optional)</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-colors
            ${autoFilled
              ? "bg-green-50 border-green-400 text-green-900 pr-10"
              : "border-gray-300 bg-white"
            }
          `}
        />
        {autoFilled && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-base">✓</span>
        )}
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Register() {
  const navigate = useNavigate();

  const [values, setValues] = useState({
    company_identifier: "",
    name: "",
    email: "",
    password: "",
  });

  // track which fields were auto-filled so we can highlight them
  const [autoFilled, setAutoFilled] = useState({ name: false, email: false });

  // lookup state
  const [lookupState, setLookupState] = useState("idle"); // idle | loading | found | not_found
  const [storeName, setStoreName] = useState("");

  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef(null);

  // ── auto-lookup when company_identifier changes ─────────────────────────────
  useEffect(() => {
    const raw = values.company_identifier.trim();

    if (!raw) {
      setLookupState("idle");
      setStoreName("");
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLookupState("loading");
      try {
        const res = await fetch(
          `${API_BASE}/api/auth/store-lookup?identifier=${encodeURIComponent(raw)}`
        );
        if (!res.ok) {
          setLookupState("not_found");
          setStoreName("");
          return;
        }
        const data = await res.json();
        setLookupState("found");
        setStoreName(data.store_name || "");

        // auto-populate name if store has owner_name
        if (data.owner_name) {
          setValues((prev) => ({ ...prev, name: data.owner_name }));
          setAutoFilled((prev) => ({ ...prev, name: true }));
        }
        // auto-populate email if store has owner_email
        if (data.owner_email) {
          setValues((prev) => ({ ...prev, email: data.owner_email }));
          setAutoFilled((prev) => ({ ...prev, email: true }));
        }
      } catch {
        setLookupState("not_found");
        setStoreName("");
      }
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [values.company_identifier]);

  // ── field change handler ─────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    // if user manually edits an auto-filled field, remove the highlight
    if (name === "name" && autoFilled.name) setAutoFilled((prev) => ({ ...prev, name: false }));
    if (name === "email" && autoFilled.email) setAutoFilled((prev) => ({ ...prev, email: false }));
  };

  // ── submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    const payload = {
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
      company_identifier: values.company_identifier.trim() || null,
    };
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(friendlyAuthError(parseApiError(data, "Registration failed. Please try again.")));
      navigate("/login");
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── lookup status badge ──────────────────────────────────────────────────────
  const LookupBadge = () => {
    if (!values.company_identifier.trim()) return null;
    if (lookupState === "loading")
      return <p className="text-xs text-gray-400 mt-1.5">🔍 Looking up store…</p>;
    if (lookupState === "found")
      return (
        <p className="text-xs text-green-600 mt-1.5">
          ✓ Found: <span className="font-semibold">{storeName}</span> — Name &amp; email auto-filled below
        </p>
      );
    if (lookupState === "not_found")
      return (
        <p className="text-xs text-amber-600 mt-1.5">
          ⚠ No active store found. Double-check the code or phone number.
        </p>
      );
    return null;
  };

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-12">
      {/* back link */}
      <Link
        to="/login"
        className="absolute top-6 left-6 text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
      >
        ← Back to login
      </Link>

      {/* card */}
      <div className="w-full max-w-md">
        {/* logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl shadow-lg mb-4">
            <span className="text-white text-2xl">💎</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter your Company ID to auto-fill details, or fill in manually.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} noValidate>
            {/* ── Company identifier ─────────────────────────────────── */}
            <div className="mb-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Company ID or Phone number
                <span className="ml-1 text-xs text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                name="company_identifier"
                value={values.company_identifier}
                onChange={handleChange}
                placeholder="e.g. SONIJEW-X7K2MQ or 9876543210"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-colors
                  ${lookupState === "found"
                    ? "border-green-400 bg-green-50"
                    : lookupState === "not_found" && values.company_identifier.trim()
                      ? "border-amber-400 bg-amber-50"
                      : "border-gray-300"
                  }
                `}
              />
              <LookupBadge />
            </div>

            <div className="my-5 border-t border-dashed border-gray-200" />

            {/* ── Name ───────────────────────────────────────────────── */}
            <Field
              label="Your Name"
              name="name"
              value={values.name}
              onChange={handleChange}
              autoFilled={autoFilled.name}
              placeholder="Full name"
            />

            {/* ── Email ──────────────────────────────────────────────── */}
            <Field
              label="Email address"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              autoFilled={autoFilled.email}
              placeholder="you@example.com"
            />

            {/* ── Password ───────────────────────────────────────────── */}
            <Field
              label="Password"
              name="password"
              type="password"
              value={values.password}
              onChange={handleChange}
              placeholder="Min 8 chars, 1 letter, 1 number"
            />

            {submitError && (
              <InlineError message={submitError} onDismiss={() => setSubmitError("")} className="mb-4" />
            )}

            <Button type="submit" size="full" loading={submitting} loadingText="Creating account…">
              Register →
            </Button>

            <p className="text-center text-sm mt-5 text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-indigo-600 hover:underline font-medium">
                Sign in here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
