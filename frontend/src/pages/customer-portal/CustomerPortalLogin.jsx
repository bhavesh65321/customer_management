import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../api";
import BackButton from "../../components/ui/BackButton";
import { parseApiError, friendlyAuthError } from "../../utils/apiError";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import InlineError from "../../components/ui/InlineError";

export default function CustomerPortalLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(friendlyAuthError(parseApiError(data, "Login failed. Please try again.")));
      localStorage.setItem("token", data.token);
      const payload = JSON.parse(atob(data.token.split(".")[1]));
      if (payload.role === "customer") {
        navigate("/customer/dashboard");
      } else {
        navigate("/home");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <BackButton to="/customer/dashboard" label="Back" />
        </div>
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-6 mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Customer login</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to view your account</p>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <InlineError message={error} onDismiss={() => setError("")} />
          )}
          <Input label="Email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" size="full">
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          Need an account? Use the invite link sent to you.
        </p>
      </div>
      </div>
    </div>
  );
}
