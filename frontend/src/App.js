import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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
import PlaceholderPage from "./pages/PlaceholderPage";
import AdminDashboard from "./pages/AdminDashboard";
import ShopPage from "./pages/ShopPage";
import ChartsDashboard from "./pages/ChartsDashboard";
import WorkersPage from "./pages/WorkersPage";
import DailySalesPage from "./pages/DailySalesPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
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
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/charts" element={<ChartsDashboard />} />
        <Route path="/workers" element={<WorkersPage />} />
        <Route path="/daily-sales" element={<DailySalesPage />} />
        <Route path="/shop" element={<ShopPage />} />
      </Routes>
    </Router>
  );
}

export default App;
