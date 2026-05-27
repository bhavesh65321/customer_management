import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./context/ToastContext";
import OfflineBanner from "./components/ui/OfflineBanner";
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
import DashboardPage from "./pages/DashboardPage";
import CustomerPortalLogin from "./pages/customer-portal/CustomerPortalLogin";
import CustomerJoin from "./pages/customer-portal/CustomerJoin";
import CustomerPortalLayout from "./pages/customer-portal/CustomerPortalLayout";
import CustomerPortalDashboard from "./pages/customer-portal/CustomerPortalDashboard";
import CustomerProfile from "./pages/customer-portal/CustomerProfile";
import CustomerInvoices from "./pages/customer-portal/CustomerInvoices";
import CustomerOrders from "./pages/customer-portal/CustomerOrders";
// import PlaceholderPage from "./pages/PlaceholderPage"; // Reserved for future use
import AdminDashboard from "./pages/AdminDashboard";
import StoreDetailPage from "./pages/StoreDetailPage";
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
import GirviDetailPage from "./pages/girvi/GirviDetailPage";
import MetalExchangePage from "./pages/metal-exchange/MetalExchangePage";
import MetalExchangeNewPage from "./pages/metal-exchange/MetalExchangeNewPage";
import MetalExchangeAdvancePage from "./pages/metal-exchange/MetalExchangeAdvancePage";
import MetalRatesPage from "./pages/metal-exchange/MetalRatesPage";
import OrdersPage from "./pages/orders/OrdersPage";
import OrdersNewPage from "./pages/orders/OrdersNewPage";
import OrderDetailPage from "./pages/orders/OrderDetailPage";
import WorkflowTemplatesPage from "./pages/orders/WorkflowTemplatesPage";
import WorkflowTemplateEditPage from "./pages/orders/WorkflowTemplateEditPage";
import StockPage from "./pages/stock/StockPage";
import StockNewItemPage from "./pages/stock/StockNewItemPage";
import StockEditItemPage from "./pages/stock/StockEditItemPage";
import StockMovementsPage from "./pages/stock/StockMovementsPage";
import StockLowStockPage from "./pages/stock/StockLowStockPage";
import InventoryPiecesPage from "./pages/inventory/InventoryPiecesPage";
import InventoryPieceNewPage from "./pages/inventory/InventoryPieceNewPage";
import InventoryPieceDetailPage from "./pages/inventory/InventoryPieceDetailPage";
import KarigarsPage from "./pages/karigars/KarigarsPage";
import InsightsPage from "./pages/insights/InsightsPage";
import ActivityHistoryPage from "./pages/ActivityHistoryPage";
import JewelleryBusinessDashboard from "./pages/JewelleryBusinessDashboard";
import GSTReportsPage from "./pages/GSTReportsPage";
import RolePermissionsPage from "./pages/RolePermissionsPage";
import BillingPage from "./pages/BillingPage";
import LandingPage from "./pages/LandingPage";
import OnboardingWizard from "./pages/OnboardingWizard";
import SignupPage from "./pages/SignupPage";
// PlaceholderPage intentionally not imported - reserved for future use

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <OfflineBanner />
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/onboarding" element={<OnboardingWizard />} />
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
          <Route path="home" element={<DashboardPage />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/stores/:storeId" element={<StoreDetailPage />} />
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
          <Route path="girvi/:id" element={<GirviDetailPage />} />
          <Route path="metal-exchange" element={<MetalExchangePage />} />
          <Route path="metal-exchange/new" element={<MetalExchangeNewPage />} />
          <Route path="metal-exchange/advance" element={<MetalExchangeAdvancePage />} />
          <Route path="metal-exchange/rates" element={<MetalRatesPage />} />
          <Route path="orders/new" element={<OrdersNewPage />} />
          <Route path="orders/:orderId" element={<OrderDetailPage />} />
          <Route path="orders/workflows/new" element={<WorkflowTemplateEditPage />} />
          <Route path="orders/workflows/:templateId/edit" element={<WorkflowTemplateEditPage />} />
          <Route path="orders/workflows" element={<WorkflowTemplatesPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="stock/items/new" element={<StockNewItemPage />} />
          <Route path="stock/items/:itemId/edit" element={<StockEditItemPage />} />
          <Route path="stock/movements" element={<StockMovementsPage />} />
          <Route path="stock/low-stock" element={<StockLowStockPage />} />
          <Route path="inventory/pieces" element={<InventoryPiecesPage />} />
          <Route path="inventory/pieces/new" element={<InventoryPieceNewPage />} />
          <Route path="inventory/pieces/:id/edit" element={<InventoryPieceNewPage />} />
          <Route path="inventory/pieces/:id" element={<InventoryPieceDetailPage />} />
          <Route path="karigars" element={<KarigarsPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="activity-history" element={<ActivityHistoryPage />} />
          <Route path="jewellery-business" element={<JewelleryBusinessDashboard />} />
          <Route path="gst-reports" element={<GSTReportsPage />} />
          <Route path="role-permissions" element={<RolePermissionsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="billing/plans" element={<BillingPage />} />
        </Route>
      </Routes>
    </Router>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily: "inherit", fontSize: "14px" },
            success: { iconTheme: { primary: "#16a34a", secondary: "#fff" } },
            error: { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
          }}
        />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
