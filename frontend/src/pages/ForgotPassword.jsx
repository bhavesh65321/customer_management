import React, { useState } from "react";
import { Link } from "react-router-dom";
import BackButton from "../components/ui/BackButton";
import { API_BASE } from "../api";
import { parseApiError, friendlyAuthError } from "../utils/apiError";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import InlineError from "../components/ui/InlineError";

export default function ForgotPassword() {
  const [email, setEmail]   = useState("");
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(friendlyAuthError(parseApiError(data, "Request failed. Please try again.")));
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 w-full max-w-md text-center">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 text-sm mb-6">
            If an account exists for <strong>{email}</strong>, a password reset link has been sent. Check your inbox and spam folder.
          </p>
          <Link to="/login" className="text-indigo-600 text-sm font-medium hover:underline">
            ← Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-indigo-50 p-4">
      <div className="absolute top-4 left-4 z-10">
        <BackButton to="/login" label="Back" />
      </div>
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Forgot password?</h2>
        <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send a reset link.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          {error && <InlineError message={error} onDismiss={() => setError("")} />}
          <Button type="submit" size="full" loading={loading} loadingText="Sending…">
            Send reset link
          </Button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-5">
          Remember your password?{" "}
          <Link to="/login" className="text-indigo-600 font-medium hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
