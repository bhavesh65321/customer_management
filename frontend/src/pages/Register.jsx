import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "../components/ui/AutoForm";
import BackButton from "../components/ui/BackButton";
import { API_BASE } from "../api";

export default function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    company_identifier: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    const payload = {
      name: values.name,
      email: values.email,
      password: values.password,
      company_identifier: values.company_identifier.trim() || null,
    };

    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      const message = data.detail || data.message || "Registration failed";

      if (!response.ok) throw new Error(message);

      navigate("/login");
    } catch (err) {
      setError(err.message);
    }
  };

  const fields = [
    {
      name: "company_identifier",
      label: "Company ID or phone number",
      type: "text",
      required: false,
    },
    { name: "name", label: "Name" },
    { name: "email", label: "Email", type: "email" },
    { name: "password", label: "Password", type: "password" },
  ];

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-10">
        <BackButton label="Back" />
      </div>
      <AuthForm
        title="Create Account"
        subtitle="Enter the Company ID, Customer ID, or company phone shared by your admin. Then set your name, email, and password."
        backgroundColor="bg-[#fdf6e3]"
        fields={fields}
        values={values}
        onChange={handleChange}
        onSubmit={handleRegister}
        submitLabel="Register"
        error={error}
        footerText="Already have an account?"
        footerLinkText="Login here"
        footerLinkTo="/login"
      />
    </div>
  );
}
