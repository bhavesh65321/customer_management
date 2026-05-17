import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE } from "../api";
import { parseApiError, friendlyAuthError } from "../utils/apiError";
import { Button } from "../components/ui/Button";

const STEPS = ["Your Details", "Your Shop"];

function InputField({ label, name, type = "text", value, onChange, placeholder, required = true, hint }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {!required && <span className="ml-1 text-xs text-gray-400">(optional)</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    store_name: "",
    city: "",
    gstin: "",
  });

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  // ── Step 1 validation ────────────────────────────────────────────────────
  const validateStep1 = () => {
    if (!form.name.trim()) return "Please enter your name.";
    if (!form.email.trim()) return "Please enter your email.";
    if (!/\S+@\S+\.\S+/.test(form.email)) return "Please enter a valid email.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (!/[a-zA-Z]/.test(form.password)) return "Password must contain at least one letter.";
    if (!/\d/.test(form.password)) return "Password must contain at least one number.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    return null;
  };

  const goNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError("");
    setStep(1);
  };

  // ── Final submit ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.store_name.trim()) { setError("Please enter your shop name."); return; }
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/owner-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone || null,
          store_name: form.store_name.trim(),
          city: form.city || null,
          gstin: form.gstin || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const raw = parseApiError(data, "Registration failed. Please try again.");
        setError(friendlyAuthError(raw));
        return;
      }

      // Store token + shop info
      localStorage.setItem("token", data.token);
      if (data.refresh_token) localStorage.setItem("refreshToken", data.refresh_token);
      if (data.store_name) localStorage.setItem("shopName", data.store_name);

      // Show company code briefly then redirect to onboarding
      navigate("/onboarding", {
        state: { company_code: data.company_code, store_name: data.store_name },
      });
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // ── Password strength indicator ──────────────────────────────────────────
  const pwStrength = () => {
    const p = form.password;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^a-zA-Z0-9]/.test(p)) score++;
    const labels = ["Weak", "Fair", "Good", "Strong"];
    const colors = ["bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-green-500"];
    return { label: labels[score - 1] || "Weak", color: colors[score - 1] || "bg-red-400", width: `${(score / 4) * 100}%` };
  };
  const strength = pwStrength();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <span className="text-4xl">💎</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Jewellery Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Start your free 14-day trial</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? "bg-green-500 text-white" : i === step ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${i === step ? "text-indigo-700" : "text-gray-400"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 max-w-12 rounded ${i < step ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-7">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">👤 Your Details</h2>
              <InputField label="Full Name" name="name" value={form.name} onChange={set("name")} placeholder="Ramesh Sharma" />
              <InputField label="Email Address" name="email" type="email" value={form.email} onChange={set("email")} placeholder="owner@yourshop.com" />
              <InputField label="Phone" name="phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="9876543210" required={false} />
              <InputField label="Password" name="password" type="password" value={form.password} onChange={set("password")} placeholder="Min. 8 chars, 1 letter, 1 number" />
              {strength && (
                <div className="mb-4 -mt-2">
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: strength.width }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Password strength: {strength.label}</p>
                </div>
              )}
              <InputField label="Confirm Password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="Re-enter your password" />
              <Button onClick={goNext} size="full">
                Continue →
              </Button>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-bold text-gray-900 mb-4">🏪 Your Shop Details</h2>
              <InputField label="Shop Name" name="store_name" value={form.store_name} onChange={set("store_name")} placeholder="Lalaji Gold & Jewellers" />
              <InputField label="City" name="city" value={form.city} onChange={set("city")} placeholder="Surat, Jaipur, Mumbai…" required={false} />
              <InputField
                label="GSTIN" name="gstin" value={form.gstin} onChange={set("gstin")}
                placeholder="27AABCU9603R1ZX" required={false}
                hint="You can add this later from Settings."
              />
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => { setStep(0); setError(""); }}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-2 flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {loading ? "Creating…" : "🚀 Create My Account"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link>
        </p>
        <p className="text-center text-xs text-gray-400 mt-2">
          Joining a team?{" "}
          <Link to="/register" className="text-gray-500 hover:underline">Enter your Company ID</Link>
        </p>
      </div>
    </div>
  );
}
