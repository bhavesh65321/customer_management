import React, { useState } from "react";
import { Link } from "react-router-dom";
import BackButton from "../components/ui/BackButton";
import { API_BASE } from "../api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Request failed");
      setSent(true);
      if (data.reset_link) setResetLink(data.reset_link);
      else if (data.reset_token) setResetLink(`/reset-password?token=${data.reset_token}`);
    } catch (err) {
      setError(err.message);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ede9fe] p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-600 mb-4">
            If an account exists for that email, use the link below to set a new password.
          </p>
          {resetLink && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Reset link (copy or open):</p>
              <a
                href={resetLink}
                className="block w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg break-all hover:bg-blue-100"
              >
                {resetLink.startsWith("http") ? resetLink : `${window.location.origin}${resetLink}`}
              </a>
              <p className="text-xs text-gray-500 mt-2">Link expires in 1 hour.</p>
            </div>
          )}
          <Link to="/login" className="block text-center text-blue-600 hover:underline font-medium">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#ede9fe] p-4">
      <div className="absolute top-4 left-4 z-10">
        <BackButton to="/login" label="Back" />
      </div>
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2">Forgot password</h2>
        <p className="mb-6 text-gray-600">Enter your email to get a password reset link.</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            Send reset link
          </button>
          <p className="text-center text-sm mt-4">
            Remember your password?{" "}
            <Link to="/login" className="text-blue-500 hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
