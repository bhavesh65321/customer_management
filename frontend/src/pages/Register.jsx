// File: frontend/src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "../components/ui/AutoForm";

export default function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Registration failed");

      navigate("/login");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthForm
      title="Create Account"
      subtitle="Let’s get you started!"
      backgroundColor="bg-[#fdf6e3]"
      fields={[
        { name: "name", label: "Name" },
        { name: "email", label: "Email", type: "email" },
        { name: "password", label: "Password", type: "password" },
      ]}
      values={values}
      onChange={handleChange}
      onSubmit={handleRegister}
      submitLabel="Register"
      error={error}
      footerText="Already have an account?"
      footerLinkText="Login here"
      footerLinkTo="/login"
    />
  );
}
