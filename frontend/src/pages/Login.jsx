// File: frontend/src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthForm from "../components/ui/AutoForm";
import BackButton from "../components/ui/BackButton";
import { API_BASE, parseJwt } from "../api";

export default function Login() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json().catch(() => ({}));
      const message = Array.isArray(data.detail)
        ? data.detail.map((d) => d.msg).join(", ")
        : data.detail || data.message || "Login failed";

      if (!response.ok) throw new Error(message);

      localStorage.setItem("token", data.token);
      try {
        const payload = parseJwt(data.token);
        if (payload?.role === "customer") {
          navigate("/customer/dashboard");
          return;
        }
        if (payload?.role === "admin") {
          navigate("/admin");
          return;
        }
      } catch (_) {}
      navigate("/home");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-10">
        <BackButton label="Back" />
      </div>
      <AuthForm
        title="Login"
      subtitle="Hi, Welcome back 👋"
      fields={[
        { name: "email", label: "Email", type: "email" },
        { name: "password", label: "Password", type: "password" },
      ]}
      values={values}
      onChange={handleChange}
      onSubmit={handleLogin}
      submitLabel="Login"
      error={error}
      footerText="Not registered yet?"
      footerLinkText="Create an account"
      footerLinkTo="/register"
      extraFooter={
        <p className="text-center text-sm mt-2">
          <Link to="/forgot-password" className="text-blue-500 hover:underline">
            Forgot password?
          </Link>
        </p>
      }
      />
    </div>
  );
}
