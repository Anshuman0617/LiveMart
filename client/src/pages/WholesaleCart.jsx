// client/src/pages/WholesaleCart.jsx
import React, { useState, useEffect } from "react";
import { api, authHeader } from "../api";
import { useNavigate, Link } from "react-router-dom";

export default function WholesaleCart() {
  const [cart, setCart] = useState([]);
  const [cartItems, setCartItems] = useState([]); // Cart items with full product details
  const [userAddress, setUserAddress] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const navigate = useNavigate();

  // Load cart items with full product details
  useEffect(() => {
    const loadCart = async () => {
      // Get user-specific wholesale cart
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      const userId = user?.id;
      const cartKey = userId ? `wholesaleCart_${userId}` : 'wholesaleCart';
      const c = JSON.parse(localStorage.getItem(cartKey) || "[]");
      setCart(c);
      
      // Fetch full product details for each cart item
      setLoadingProducts(true);
      try {
        const itemsWithDetails = await Promise.all(
          c.map(async (item) => {
            try {
              const productRes = await api.get(`/products/${item.productId}`);
              const product = productRes.data;
              return {
                ...item,
                product: product,
                discount: product.discount || 0,
                imageUrl: product.imageUrl || (product.images && product.images[0]) || null,
                description: product.description || ''
              };
            } catch (err) {
              console.error(`Failed to load product ${item.productId}:`, err);
              return {
                ...item,
                product: null,
                discount: 0,
                imageUrl: null,
                description: ''
              };
            }
          })
        );
        setCartItems(itemsWithDetails);
      } catch (err) {
        console.error("Failed to load cart products:", err);
        setCartItems(c.map(item => ({ ...item, product: null, discount: 0, imageUrl: null, description: '' })));
      } finally {
        setLoadingProducts(false);
      }
    };
    
    loadCart();
    
    // Load user's saved address and details
    const loadUserDetails = async () => {
      try {
        const res = await api.get("/users/me");
        const user = res.data;
        if (user.address) {
          setUserAddress(user.address);
        }
        if (user.phone) {
          setUserPhone(user.phone);
        }
        if (user.name) {
          setFirstName(user.name);
        }
        if (user.email) {
          setEmail(user.email);
        }
      } catch (err) {
        // User not logged in or error - that's okay
        console.log("Could not load user details:", err);
      }
    };
    loadUserDetails();
  }, []);

  const updateCart = async (c, skipReload = false) => {
    setCart(c);
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userId = user?.id;
    const cartKey = userId ? `wholesaleCart_${userId}` : 'wholesaleCart';
    localStorage.setItem(cartKey, JSON.stringify(c));
    
    // Only reload product details if not skipping (for quantity changes, just update the quantity)
    if (!skipReload) {
      setLoadingProducts(true);
      try {
        const itemsWithDetails = await Promise.all(
          c.map(async (item) => {
            try {
              const productRes = await api.get(`/products/${item.productId}`);
              const product = productRes.data;
              return {
                ...item,
                product: product,
                discount: product.discount || 0,
                imageUrl: product.imageUrl || (product.images && product.images[0]) || null,
                description: product.description || ''
              };
            } catch (err) {
              console.error(`Failed to load product ${item.productId}:`, err);
              return {
                ...item,
                product: null,
                discount: 0,
                imageUrl: null,
                description: ''
              };
            }
          })
        );
        setCartItems(itemsWithDetails);
      } catch (err) {
        console.error("Failed to load cart products:", err);
        setCartItems(c.map(item => ({ ...item, product: null, discount: 0, imageUrl: null, description: '' })));
      } finally {
        setLoadingProducts(false);
      }
    } else {
      // Just update quantities in existing cartItems without reloading
      setCartItems(prevItems => {
        return prevItems.map(prevItem => {
          const updatedItem = c.find(item => item.productId === prevItem.productId);
          if (updatedItem) {
            return { ...prevItem, quantity: updatedItem.quantity };
          }
          return prevItem;
        }).filter(item => c.some(cItem => cItem.productId === item.productId));
      });
    }
  };

  const increment = (id) => {
    const c = [...cart];
    const item = c.find((i) => i.productId === id);
    if (item) {
      const cartItem = cartItems.find(ci => ci.productId === id);
      const maxQuantity = Math.min(10, cartItem?.product?.stock || 10);
      
      if (item.quantity >= maxQuantity) {
        alert(`Maximum ${maxQuantity} items allowed for this product.`);
        return;
      }
      
      item.quantity++;
      updateCart(c, true); // Skip reload to prevent flashing
    }
  };

  const decrement = (id) => {
    const c = [...cart];
    const item = c.find((i) => i.productId === id);
    if (item && item.quantity > 1) {
      item.quantity--;
      updateCart(c, true); // Skip reload to prevent flashing
    }
  };

  const removeItem = (id) => {
    updateCart(cart.filter((i) => i.productId !== id));
  };

  // Calculate total with discount
  const total = cartItems.reduce((sum, item) => {
    const originalPrice = parseFloat(item.price || 0);
    const discount = parseFloat(item.discount || 0);
    const discountedPrice = originalPrice * (1 - discount / 100);
    return sum + discountedPrice * item.quantity;
  }, 0);

  // Calculate total savings from discounts
  const totalSavings = cartItems.reduce((sum, item) => {
    const originalPrice = parseFloat(item.price || 0);
    const discount = parseFloat(item.discount || 0);
    const savings = (originalPrice * discount / 100) * item.quantity;
    return sum + savings;
  }, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Your wholesale cart is empty!");
      return;
    }

    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in to proceed with checkout");
      navigate("/login");
      return;
    }

    // Validate address and phone from profile
    if (!userAddress.trim()) {
      alert("Please set your address in profile settings before checkout");
      return;
    }

    if (!userPhone.trim()) {
      alert("Please set your phone number in profile settings before checkout");
      return;
    }

    if (!firstName.trim() || !email.trim()) {
      alert("Please fill in all required details (Name, Email)");
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
        { items, address: userAddress, firstName, email, phone: userPhone },
        { headers: authHeader() }
      );

      const { paymentUrl, paymentParams, txnId } = paymentRes.data;

      // Store order details in sessionStorage for verification
      // Mark as wholesale order
      sessionStorage.setItem('pendingOrder', JSON.stringify({
        txnId,
        items,
        address: userAddress,
        isWholesale: true, // Flag to identify wholesale orders
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
      <h2>Wholesale Cart</h2>

      {loadingProducts && <p>Loading cart items...</p>}

      {!loadingProducts && cart.length === 0 && <p>No items in wholesale cart.</p>}

      {!loadingProducts && cartItems.length > 0 && (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
          gap: "20px",
          marginBottom: "30px"
        }}>
          {cartItems.map((item) => {
            const originalPrice = parseFloat(item.price || 0);
            const discount = parseFloat(item.discount || 0);
            const discountedPrice = originalPrice * (1 - discount / 100);
            const itemTotal = discountedPrice * item.quantity;
            const itemSavings = (originalPrice * discount / 100) * item.quantity;

            return (
              <div
                key={item.productId}
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "12px",
                  padding: "16px",
                  backgroundColor: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}
              >
                {/* Product Image */}
                {item.imageUrl && (
                  <Link to={`/product/${item.productId}`}>
                    <img
                      src={`http://localhost:4000${item.imageUrl}`}
                      alt={item.title}
                      style={{
                        width: "100%",
                        height: "200px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        cursor: "pointer"
                      }}
                    />
                  </Link>
                )}

                {/* Product Title */}
                <Link 
                  to={`/product/${item.productId}`}
                  style={{ 
                    textDecoration: "none", 
                    color: "inherit",
                    fontSize: "18px",
                    fontWeight: "600"
                  }}
                >
                  <h3 style={{ margin: 0, color: "#333" }}>{item.title}</h3>
                </Link>

                {/* Description */}
                {item.description && (
                  <p style={{ 
                    margin: 0, 
                    color: "#666", 
                    fontSize: "14px",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}>
                    {item.description}
                  </p>
                )}

                {/* Price Information */}
                <div style={{ marginTop: "auto" }}>
                  {discount > 0 ? (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ 
                          fontSize: "20px", 
                          fontWeight: "bold", 
                          color: "#22c55e" 
                        }}>
                          ₹{discountedPrice.toFixed(2)}
                        </span>
                        <span style={{ 
                          fontSize: "14px", 
                          color: "#999", 
                          textDecoration: "line-through" 
                        }}>
                          ₹{originalPrice.toFixed(2)}
                        </span>
                        <span style={{ 
                          fontSize: "12px", 
                          color: "#dc2626", 
                          fontWeight: "600",
                          backgroundColor: "#fee2e2",
                          padding: "2px 6px",
                          borderRadius: "4px"
                        }}>
                          {discount}% OFF
                        </span>
                      </div>
                      {itemSavings > 0 && (
                        <p style={{ margin: 0, fontSize: "12px", color: "#22c55e" }}>
                          You save ₹{itemSavings.toFixed(2)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: "20px", fontWeight: "bold" }}>
                      ₹{originalPrice.toFixed(2)}
                    </span>
                  )}
                  
                  <div style={{ marginTop: "8px", fontSize: "16px", fontWeight: "600" }}>
                    Subtotal: ₹{itemTotal.toFixed(2)} ({item.quantity} {item.quantity === 1 ? 'item' : 'items'})
                  </div>
                </div>

                {/* Quantity Controls */}
                <div style={{ 
                  display: "flex", 
                  gap: "12px", 
                  alignItems: "center",
                  marginTop: "8px"
                }}>
                  <button
                    onClick={() => decrement(item.productId)}
                    style={{
                      width: "36px",
                      height: "36px",
                      border: "1px solid #3399cc",
                      borderRadius: "6px",
                      background: "#3399cc",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "18px",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.target.style.background = "#2a7ba0"}
                    onMouseLeave={(e) => e.target.style.background = "#3399cc"}
                  >
                    -
                  </button>
                  <span style={{ 
                    fontSize: "16px", 
                    fontWeight: "600",
                    minWidth: "30px",
                    textAlign: "center"
                  }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => increment(item.productId)}
                    style={{
                      width: "36px",
                      height: "36px",
                      border: "1px solid #3399cc",
                      borderRadius: "6px",
                      background: "#3399cc",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "18px",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.target.style.background = "#2a7ba0"}
                    onMouseLeave={(e) => e.target.style.background = "#3399cc"}
                  >
                    +
                  </button>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeItem(item.productId)}
                  style={{
                    marginTop: "8px",
                    padding: "8px 16px",
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => e.target.style.background = "#b91c1c"}
                  onMouseLeave={(e) => e.target.style.background = "#dc2626"}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!loadingProducts && cart.length > 0 && (
        <>
          <div style={{
            marginTop: "30px",
            padding: "20px",
            backgroundColor: "#f5f5f5",
            borderRadius: "12px",
            maxWidth: "500px"
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Order Summary</h3>
            
            {totalSavings > 0 && (
              <div style={{ 
                marginBottom: "12px",
                padding: "12px",
                backgroundColor: "#dcfce7",
                borderRadius: "8px",
                border: "1px solid #86efac"
              }}>
                <p style={{ margin: 0, fontSize: "14px", color: "#166534" }}>
                  <strong>Total Savings:</strong> ₹{totalSavings.toFixed(2)}
                </p>
              </div>
            )}
            
            <div style={{ 
              fontSize: "24px", 
              fontWeight: "bold",
              paddingTop: "12px",
              borderTop: "2px solid #ddd"
            }}>
              Total: ₹{total.toFixed(2)}
            </div>
          </div>

          <div style={{ marginTop: 20, maxWidth: 500 }}>
            <h3 style={{ marginBottom: "16px" }}>Shipping Information</h3>
            
            <div style={{ 
              marginBottom: "20px",
              padding: "16px",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ marginBottom: "12px" }}>
                <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", fontWeight: 600, marginBottom: "4px" }}>
                  Shipping Address:
                </p>
                <p style={{ margin: 0, fontSize: "14px", color: "#111827" }}>
                  {userAddress || <span style={{ color: "#dc2626" }}>Not set. Please set in profile settings.</span>}
                </p>
              </div>

              <div>
                <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", fontWeight: 600, marginBottom: "4px" }}>
                  Phone Number:
                </p>
                <p style={{ margin: 0, fontSize: "14px", color: "#111827" }}>
                  {userPhone || <span style={{ color: "#dc2626" }}>Not set. Please set in profile settings.</span>}
                </p>
              </div>

              {(!userAddress || !userPhone) && (
                <div style={{ 
                  marginTop: "12px",
                  padding: "8px 12px",
                  backgroundColor: "#fef2f2",
                  borderRadius: "6px",
                  border: "1px solid #fecaca"
                }}>
                  <p style={{ margin: 0, fontSize: "12px", color: "#991b1b" }}>
                    ⚠️ Please set your address and phone number in profile settings to proceed with checkout.
                  </p>
                </div>
              )}
            </div>

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
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || !userAddress.trim() || !userPhone.trim()}
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

