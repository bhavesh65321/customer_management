import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import BackButton from "../components/ui/BackButton";
import { API_BASE } from "../api";
import InlineError from "../components/ui/InlineError";
import { Button } from "../components/ui/Button";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tokenFromUrl) setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 1) {
      setError("Enter a new password");
      return;
    }
    if (!token.trim()) {
      setError("Missing reset link. Use the link from your email or forgot password page.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), new_password: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Reset failed");
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ede9fe] p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Password updated</h2>
          <p className="text-gray-600 mb-6">You can now log in with your new password.</p>
          <Link
            to="/login"
            className="inline-block w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition text-center"
          >
            Go to Login
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
        <h2 className="text-2xl font-bold mb-2">Set new password</h2>
        <p className="mb-6 text-gray-600">Enter your new password below.</p>
        <form onSubmit={handleSubmit}>
          {!tokenFromUrl && (
            <div className="mb-4">
              <label className="block mb-1 font-medium">Reset token</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste the token from your reset link"
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}
          <div className="mb-4">
            <label className="block mb-1 font-medium">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
              required
              minLength={1}
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-medium">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
              required
              minLength={1}
            />
          </div>
          {error && <InlineError message={error} onDismiss={() => setError("")} />}
          <Button type="submit" size="full">
            Reset password
          </Button>
          <p className="text-center text-sm mt-4">
            <Link to="/login" className="text-blue-500 hover:underline">
              Back to Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
