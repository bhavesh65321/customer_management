import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CustomerDashboard from "./pages/CustomerDashboard";
import AddCustomer from "./components/ui/AddCustomer";
import BuyProduct from "./components/ui/BuyProduct";
import CustomerAccount from "./components/ui/AccountDetails";
import EditProductPopup from "./components/ui/EditProductPopup";
import Home from "./pages/Home";
import CustomerPortalLogin from "./pages/customer-portal/CustomerPortalLogin";
import CustomerJoin from "./pages/customer-portal/CustomerJoin";
import CustomerPortalLayout from "./pages/customer-portal/CustomerPortalLayout";
import CustomerPortalDashboard from "./pages/customer-portal/CustomerPortalDashboard";
import CustomerProfile from "./pages/customer-portal/CustomerProfile";
import CustomerInvoices from "./pages/customer-portal/CustomerInvoices";
import CustomerOrders from "./pages/customer-portal/CustomerOrders";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/customer/login" element={<CustomerPortalLogin />} />
        <Route path="/customer/join" element={<CustomerJoin />} />
        <Route path="/customer" element={<CustomerPortalLayout />}>
          <Route index element={<Navigate to="/customer/dashboard" replace />} />
          <Route path="dashboard" element={<CustomerPortalDashboard />} />
          <Route path="profile" element={<CustomerProfile />} />
          <Route path="invoices" element={<CustomerInvoices />} />
          <Route path="orders" element={<CustomerOrders />} />
        </Route>
        <Route path="/customerDashboard" element={<CustomerDashboard />} />
        <Route path="/addCustomer" element={<AddCustomer />} />
        <Route path="/buyProduct" element={<BuyProduct />} />
        <Route path="/customer/:customerId" element={<CustomerAccount />} />
        <Route path="/transactions/:customerId" element={<CustomerAccount />} />
        <Route path="/transactions" element={<EditProductPopup />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
