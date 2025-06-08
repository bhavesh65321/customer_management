// File: frontend/src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "../components/ui/AutoForm";

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
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Login failed");

      localStorage.setItem("token", data.token);
      navigate('/home');
      // navigate("/customerDashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
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
    />
  );
}
