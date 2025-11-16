// client/src/pages/Cart.jsx
import React, { useState, useEffect } from "react";
import { api, authHeader } from "../api";
import AddressAutocomplete from "../components/AddressAutocomplete";
import { useNavigate } from "react-router-dom";

export default function Cart() {
  const [cart, setCart] = useState([]);
  const [address, setAddress] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user-specific cart
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userId = user?.id;
    const cartKey = userId ? `cart_${userId}` : 'cart';
    const c = JSON.parse(localStorage.getItem(cartKey) || "[]");
    setCart(c);
    
    // Load user's saved address and details
    const loadUserDetails = async () => {
      try {
        const res = await api.get("/users/me");
        const user = res.data;
        if (user.address) {
          setAddress(user.address);
        }
        if (user.name) {
          setFirstName(user.name);
        }
        if (user.email) {
          setEmail(user.email);
        }
        if (user.phone) {
          setPhone(user.phone);
        }
      } catch (err) {
        // User not logged in or error - that's okay
        console.log("Could not load user details:", err);
      }
    };
    loadUserDetails();
  }, []);

  const updateCart = (c) => {
    setCart(c);
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userId = user?.id;
    const cartKey = userId ? `cart_${userId}` : 'cart';
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

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    if (!address.trim()) {
      alert("Please enter a shipping address");
      return;
    }

    if (!firstName.trim() || !email.trim() || !phone.trim()) {
      alert("Please fill in all required details (Name, Email, Phone)");
      return;
    }

    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in to proceed with checkout");
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      // Prepare items for order
      const items = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      // Create PayU payment request
      const paymentRes = await api.post(
        "/payments/create-payment",
        { items, address, firstName, email, phone },
        { headers: authHeader() }
      );

      const { paymentUrl, paymentParams, txnId } = paymentRes.data;

      // Store order details in sessionStorage for verification
      sessionStorage.setItem('pendingOrder', JSON.stringify({
        txnId,
        items,
        address,
      }));

      // Create and submit form to PayU
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = paymentUrl;
      
      Object.keys(paymentParams).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = paymentParams[key];
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error("Checkout error:", err);
      alert(
        err.response?.data?.error ||
          "Failed to initiate payment. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h2>Your Cart</h2>

      {cart.length === 0 && <p>No items in cart.</p>}

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

          <div style={{ marginTop: 20, maxWidth: 500 }}>
            <p style={{ marginBottom: 10 }}>Shipping Address:</p>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              placeholder="Enter shipping address"
            />

            <div style={{ marginTop: 15 }}>
              <p style={{ marginBottom: 5 }}>Name: *</p>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Your full name"
                style={{ width: "100%", padding: "8px", marginBottom: 10 }}
                required
              />
            </div>

            <div>
              <p style={{ marginBottom: 5 }}>Email: *</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                style={{ width: "100%", padding: "8px", marginBottom: 10 }}
                required
              />
            </div>

            <div>
              <p style={{ marginBottom: 5 }}>Phone: *</p>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                style={{ width: "100%", padding: "8px", marginBottom: 10 }}
                required
              />
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || !address.trim()}
            style={{
              marginTop: 20,
              padding: "12px 24px",
              fontSize: "16px",
              background: loading ? "#ccc" : "#3399cc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Processing..." : "Proceed to Checkout"}
          </button>
        </>
      )}
    </div>
  );
}
