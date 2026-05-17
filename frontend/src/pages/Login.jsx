// File: frontend/src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE, parseJwt } from "../api";
import { parseApiError, friendlyAuthError } from "../utils/apiError";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

// ── Shared wrapper — must be OUTSIDE Login to avoid remount on every render ──
function PageWrapper({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <span className="text-4xl">💎</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Jewellery Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back 👋</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [twoFa, setTwoFa] = useState({ required: false, tempToken: "", otp: "" });
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  const handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.value });

  const _redirectByRole = (token) => {
    try {
      const payload = parseJwt(token);
      if (payload?.role === "customer")   { navigate("/customer/dashboard"); return; }
      if (payload?.role === "superadmin") { navigate("/admin"); return; }
      if (payload?.role === "admin")      { navigate("/home"); return; }
    } catch (_) {}
    navigate("/home");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const raw = parseApiError(data, "Login failed. Please try again.");
        throw new Error(friendlyAuthError(raw));
      }

      if (data.requires_2fa) {
        setTwoFa({ required: true, tempToken: data.temp_token, otp: "" });
        return;
      }
      localStorage.setItem("token", data.token);
      if (data.refresh_token) localStorage.setItem("refreshToken", data.refresh_token);
      _redirectByRole(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setError("");
    if (twoFa.otp.length !== 6) { setError("Please enter the 6-digit code."); return; }
    setTwoFaLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temp_token: twoFa.tempToken, otp_code: twoFa.otp }),
      });
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data.detail)
        ? data.detail.map((d) => d.msg).join(", ")
        : data.detail || "Verification failed.";
      if (!res.ok) { setError(msg); return; }
      localStorage.setItem("token", data.token);
      if (data.refresh_token) localStorage.setItem("refreshToken", data.refresh_token);
      _redirectByRole(data.token);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setTwoFaLoading(false);
    }
  };

  // ── 2FA OTP screen ───────────────────────────────────────────────────────
  if (twoFa.required) {
    return (
      <PageWrapper>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="text-4xl mb-3">🔐</div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">2-Step Verification</h2>
          <p className="text-sm text-gray-500 mb-6">
            We sent a 6-digit code to your email.<br />
            Enter it below to complete sign-in.
          </p>
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}
          <form onSubmit={handleVerify2FA}>
            <input
              type="text" inputMode="numeric" maxLength={6}
              value={twoFa.otp}
              onChange={(e) => setTwoFa((p) => ({ ...p, otp: e.target.value.replace(/\D/g, "") }))}
              placeholder="• • • • • •"
              className="w-full text-center text-2xl font-bold tracking-widest px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
              autoFocus
            />
            <Button type="submit" size="full" loading={twoFaLoading} loadingText="Verifying…"
              disabled={twoFaLoading || twoFa.otp.length !== 6}>
              Verify & Sign In
            </Button>
          </form>
          <button
            onClick={() => { setTwoFa({ required: false, tempToken: "", otp: "" }); setError(""); }}
            className="mt-4 text-sm text-gray-400 hover:text-gray-600"
          >
            ← Back to login
          </button>
        </div>
      </PageWrapper>
    );
  }

  // ── Main login form ──────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-7">
        <h2 className="text-lg font-bold text-gray-900 mb-5">🔑 Sign In</h2>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input label="Email Address" type="email" name="email" value={values.email}
            onChange={handleChange} placeholder="owner@yourshop.com" required autoComplete="email" />

          <Input label="Password" type="password" name="password" value={values.password}
            onChange={handleChange} placeholder="Enter your password" required autoComplete="current-password" />

          <div className="text-right -mt-2">
            <Link to="/forgot-password" className="text-xs text-indigo-600 hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" size="full" loading={loading} loadingText="Signing in…">
            Sign In →
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-gray-500 mt-5">
        Don't have an account?{" "}
        <Link to="/signup" className="text-indigo-600 font-medium hover:underline">Start free trial</Link>
      </p>
      <p className="text-center text-xs text-gray-400 mt-2">
        Joining a team?{" "}
        <Link to="/register" className="text-gray-500 hover:underline">Enter your Company ID</Link>
      </p>
    </PageWrapper>
  );
}
