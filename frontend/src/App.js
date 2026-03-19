import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CustomerDashboard from "./pages/CustomerDashboard";
import AddCustomerPage from "./pages/AddCustomerPage";
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
import PaymentsPage from "./pages/PaymentsPage";
import ImportCustomersPage from "./pages/ImportCustomersPage";
import UploadBillPage from "./pages/UploadBillPage";
import RemindersPage from "./pages/RemindersPage";
import GirviPage from "./pages/girvi/GirviPage";
import GirviNewPage from "./pages/girvi/GirviNewPage";
import GirviInterestDuePage from "./pages/girvi/GirviInterestDuePage";
import MetalExchangePage from "./pages/metal-exchange/MetalExchangePage";
import MetalExchangeNewPage from "./pages/metal-exchange/MetalExchangeNewPage";
import MetalExchangeAdvancePage from "./pages/metal-exchange/MetalExchangeAdvancePage";
import OrdersPage from "./pages/orders/OrdersPage";
import OrdersNewPage from "./pages/orders/OrdersNewPage";
import StockPage from "./pages/stock/StockPage";
import StockNewItemPage from "./pages/stock/StockNewItemPage";
import StockMovementsPage from "./pages/stock/StockMovementsPage";
import StockLowStockPage from "./pages/stock/StockLowStockPage";

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
        <Route path="/" element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
          <Route path="customerDashboard" element={<CustomerDashboard />} />
          <Route path="addCustomer" element={<AddCustomerPage />} />
          <Route path="buyProduct" element={<BuyProduct />} />
          <Route path="customer/:customerId" element={<CustomerAccount />} />
          <Route path="transactions/:customerId" element={<CustomerAccount />} />
          <Route path="transactions" element={<EditProductPopup />} />
          <Route path="home" element={<Home />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="charts" element={<ChartsDashboard />} />
          <Route path="workers" element={<WorkersPage />} />
          <Route path="daily-sales" element={<DailySalesPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="import-customers" element={<ImportCustomersPage />} />
          <Route path="upload-bill" element={<UploadBillPage />} />
          <Route path="reminders" element={<RemindersPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="girvi" element={<GirviPage />} />
          <Route path="girvi/new" element={<GirviNewPage />} />
          <Route path="girvi/interest-due" element={<GirviInterestDuePage />} />
          <Route path="metal-exchange" element={<MetalExchangePage />} />
          <Route path="metal-exchange/new" element={<MetalExchangeNewPage />} />
          <Route path="metal-exchange/advance" element={<MetalExchangeAdvancePage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/new" element={<OrdersNewPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="stock/items/new" element={<StockNewItemPage />} />
          <Route path="stock/movements" element={<StockMovementsPage />} />
          <Route path="stock/low-stock" element={<StockLowStockPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
