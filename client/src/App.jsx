// client/src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Products from "./pages/Products";
import RetailerDashboard from "./pages/RetailerDashboard";
import WholesalerDashboard from "./pages/WholesalerDashboard";
import ProductDetail from "./pages/ProductDetail";
import WholesaleProducts from "./pages/WholesaleProducts";
import Cart from "./pages/Cart";
import WholesaleCart from "./pages/WholesaleCart";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import Orders from "./pages/Orders";
import DeliveryDashboard from "./pages/DeliveryDashboard";

import "./App.css";

// Route guard component to prevent delivery persons from accessing certain pages
function ProtectedRoute({ children, allowedRoles = [] }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  // If no user, allow access (will be handled by login requirement in the page itself)
  if (!user) {
    return children;
  }
  
  // If user role is in allowedRoles, allow access
  if (allowedRoles.length === 0 || allowedRoles.includes(user.role)) {
    return children;
  }
  
  // If delivery person tries to access restricted pages, redirect to delivery dashboard
  if (user.role === 'delivery') {
    return <Navigate to="/delivery" replace />;
  }
  
  // For other roles, allow access (default behavior)
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={
          <ProtectedRoute allowedRoles={['customer', 'retailer', 'wholesaler']}>
            <Products />
          </ProtectedRoute>
        } />
        <Route path="/products" element={
          <ProtectedRoute allowedRoles={['customer', 'retailer', 'wholesaler']}>
            <Products />
          </ProtectedRoute>
        } />
        <Route path="/login" element={<Login />} />

        <Route path="/product/:id" element={
          <ProtectedRoute allowedRoles={['customer', 'retailer', 'wholesaler']}>
            <ProductDetail />
          </ProtectedRoute>
        } />

        <Route path="/retailer" element={<RetailerDashboard />} />
        <Route path="/wholesaler" element={<WholesalerDashboard />} />

        <Route path="/cart" element={
          <ProtectedRoute allowedRoles={['customer']}>
            <Cart />
          </ProtectedRoute>
        } />
        <Route path="/wholesale-cart" element={<WholesaleCart />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failure" element={<PaymentFailure />} />

        <Route path="/wholesale-products" element={<WholesaleProducts />} />

        <Route path="/orders" element={<Orders />} />
        <Route path="/delivery" element={<DeliveryDashboard />} />

        {/* Catch-all route for 404 */}
        <Route path="*" element={
          <div style={{ padding: 40, textAlign: "center" }}>
            <h2>Page Not Found</h2>
            <p>The page you're looking for doesn't exist.</p>
            <button
              onClick={() => window.location.href = "/"}
              style={{
                marginTop: 20,
                padding: "12px 24px",
                fontSize: "16px",
                background: "#3399cc",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Go to Home
            </button>
          </div>
        } />

      </Routes>
    </BrowserRouter>
  );
}
