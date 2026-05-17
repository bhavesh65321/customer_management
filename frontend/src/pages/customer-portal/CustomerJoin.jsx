import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE } from "../../api";
import BackButton from "../../components/ui/BackButton";
import { parseApiError, friendlyAuthError } from "../../utils/apiError";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import InlineError from "../../components/ui/InlineError";

export default function CustomerJoin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) setError("Missing invite token. Use the link from your invite.");
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/customer/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(friendlyAuthError(parseApiError(data, "Registration failed. Please try again.")));
      localStorage.setItem("token", data.token);
      navigate("/customer/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <BackButton to="/customer/dashboard" label="Back" />
        </div>
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Create your account</h1>
        <p className="text-sm text-gray-500 mb-6">Use the invite link from your jeweller</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <InlineError message={error} onDismiss={() => setError("")} />
          )}
          <Input label="Email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <Button type="submit" size="full" loading={loading} loadingText="Creating account…"
            disabled={!token || loading}>
            Create account
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/customer/login" className="text-blue-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
      </div>
    </div>
  );
}
