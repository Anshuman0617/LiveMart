// client/src/pages/WholesaleCart.jsx
import React, { useState, useEffect } from "react";
import { api, authHeader } from "../api";
import { useNavigate } from "react-router-dom";

export default function WholesaleCart() {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user-specific wholesale cart
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userId = user?.id;
    const cartKey = userId ? `wholesaleCart_${userId}` : 'wholesaleCart';
    const c = JSON.parse(localStorage.getItem(cartKey) || "[]");
    setCart(c);
  }, []);

  const updateCart = (c) => {
    setCart(c);
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userId = user?.id;
    const cartKey = userId ? `wholesaleCart_${userId}` : 'wholesaleCart';
    localStorage.setItem(cartKey, JSON.stringify(c));
  };

  const increment = (id) => {
    const c = [...cart];
    const item = c.find((i) => i.productId === id);
    item.quantity++;
    updateCart(c);
  };

  const decrement = (id) => {
    const c = [...cart];
    const item = c.find((i) => i.productId === id);
    if (item.quantity > 1) item.quantity--;
    updateCart(c);
  };

  const removeItem = (id) => {
    updateCart(cart.filter((i) => i.productId !== id));
  };

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handlePurchase = async () => {
    if (cart.length === 0) {
      alert("Your wholesale cart is empty!");
      return;
    }

    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in to proceed with purchase");
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      // Purchase each item in the cart
      for (const item of cart) {
        try {
          await api.post(
            `/products/${item.productId}/buy-from-wholesaler`,
            { quantity: item.quantity },
            { headers: authHeader() }
          );
        } catch (err) {
          console.error(`Failed to purchase ${item.title}:`, err);
          alert(`Failed to purchase ${item.title}. ${err.response?.data?.error || 'Please try again.'}`);
        }
      }

      alert("All wholesale purchases completed!");
      // Clear cart
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      const userId = user?.id;
      const cartKey = userId ? `wholesaleCart_${userId}` : 'wholesaleCart';
      localStorage.removeItem(cartKey);
      setCart([]);
      navigate("/retailer");
    } catch (err) {
      console.error("Purchase error:", err);
      alert("Failed to complete purchases. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h2>Wholesale Cart</h2>

      {cart.length === 0 && <p>No items in wholesale cart.</p>}

      {cart.map((item) => (
        <div className="product-card" key={item.productId}>
          <h3>{item.title}</h3>
          <p>Price: ₹{item.price}</p>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => decrement(item.productId)}>-</button>
            <span>{item.quantity}</span>
            <button onClick={() => increment(item.productId)}>+</button>
          </div>

          <button
            style={{ background: "#dc2626", marginTop: 10 }}
            onClick={() => removeItem(item.productId)}
          >
            Remove
          </button>
        </div>
      ))}

      {cart.length > 0 && (
        <>
          <h3 style={{ marginTop: 20 }}>Total: ₹{total.toFixed(2)}</h3>

          <button
            onClick={handlePurchase}
            disabled={loading}
            style={{
              marginTop: 20,
              padding: "12px 24px",
              fontSize: "16px",
              background: loading ? "#ccc" : "#22c55e",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Processing..." : "Purchase All"}
          </button>
        </>
      )}
    </div>
  );
}

