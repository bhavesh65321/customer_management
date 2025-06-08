import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CustomerDashboard from "./pages/CustomerDashboard";
import AddCustomer from "./components/ui/AddCustomer";
import BuyProduct from "./components/ui/BuyProduct";
import CustomerAccount from "./components/ui/AccountDetails";
import EditProductPopup from "./components/ui/EditProductPopup";
import Home from "./pages/Home";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path = "/customerDashboard" element ={<CustomerDashboard/>} />
        <Route path = "/addCustomer" element = {<AddCustomer/>} />
        <Route path = "/buyProduct" element = { <BuyProduct/>} />
        <Route path="/customer/:customerId" element={<CustomerAccount />} />
        <Route path="/transactions/:customerId" element={<CustomerAccount />} />
        <Route path="/transactions" element={<EditProductPopup />} />
        <Route path = "/home" element ={<Home/>} />
        {/* Add more routes later */}
      </Routes>
    </Router>
  );
}

export default App;
