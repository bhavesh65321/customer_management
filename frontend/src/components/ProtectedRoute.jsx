import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken, parseJwt } from "../api";

function isTokenValid() {
  const token = getToken();
  if (!token) return false;
  const payload = parseJwt(token);
  if (!payload) return false;
  const exp = payload.exp;
  if (!exp) return true;
  return exp * 1000 > Date.now();
}

export default function ProtectedRoute({ children, requireStaff = true }) {
  const location = useLocation();
  if (!isTokenValid()) {
    localStorage.removeItem("token");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  const payload = parseJwt(getToken());
  const role = payload?.role;
  if (requireStaff && role !== "admin" && role !== "staff") {
    if (role === "customer") {
      return <Navigate to="/customer/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }
  return children;
}
