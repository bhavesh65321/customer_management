import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../api";
import BackButton from "../../components/ui/BackButton";

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
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");
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
          <BackButton label="Back" />
        </div>
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-6 mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Customer login</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to view your account</p>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Sign in
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          Need an account? Use the invite link sent to you.
        </p>
      </div>
      </div>
    </div>
  );
}
