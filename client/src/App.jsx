// client/src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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

import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Products />} />
        <Route path="/login" element={<Login />} />

        <Route path="/product/:id" element={<ProductDetail />} />

        <Route path="/retailer" element={<RetailerDashboard />} />
        <Route path="/wholesaler" element={<WholesalerDashboard />} />

        <Route path="/cart" element={<Cart />} />
        <Route path="/wholesale-cart" element={<WholesaleCart />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failure" element={<PaymentFailure />} />

        <Route path="/wholesale-products" element={<WholesaleProducts />} />

      </Routes>
    </BrowserRouter>
  );
}
