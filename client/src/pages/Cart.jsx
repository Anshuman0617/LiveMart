// client/src/pages/Cart.jsx
import React, { useState, useEffect } from "react";
import { api, authHeader } from "../api";
import AddressAutocomplete from "../components/AddressAutocomplete";
import { useNavigate, Link } from "react-router-dom";
import { useModal } from "../hooks/useModal";

export default function Cart() {
  const { showModal, ModalComponent } = useModal();
  const [cart, setCart] = useState([]);
  const [cartItems, setCartItems] = useState([]); // Cart items with full product details
  const [userAddress, setUserAddress] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [scheduledPickupTime, setScheduledPickupTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [currentOrdersExpanded, setCurrentOrdersExpanded] = useState(true);
  const [previousOrdersExpanded, setPreviousOrdersExpanded] = useState(true);
  const navigate = useNavigate();

  // Load cart items with full product details
  const loadCart = React.useCallback(async () => {
    // Get user-specific cart
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userId = user?.id;
    const cartKey = userId ? `cart_${userId}` : 'cart';
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
              description: product.description || '',
              title: product.title || item.title || ''
            };
          } catch (err) {
            console.error(`Failed to load product ${item.productId}:`, err);
            return {
              ...item,
              product: null,
              discount: 0,
              imageUrl: null,
              description: '',
              title: item.title || ''
            };
          }
        })
      );
      setCartItems(itemsWithDetails);
    } catch (err) {
      console.error("Failed to load cart products:", err);
      setCartItems(c.map(item => ({ ...item, product: null, discount: 0, imageUrl: null, description: '', title: item.title || '' })));
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
    
    // Listen for cart cleared events (from payment success)
    const handleCartCleared = (event) => {
      if (!event.detail?.isWholesale) {
        // Reload cart after it's been cleared
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const userId = user?.id;
        const cartKey = userId ? `cart_${userId}` : 'cart';
        const updatedCart = JSON.parse(localStorage.getItem(cartKey) || "[]");
        setCart(updatedCart);
        // Reload cart items
        loadCart();
      }
    };
    
    window.addEventListener('cartCleared', handleCartCleared);
    
    return () => {
      window.removeEventListener('cartCleared', handleCartCleared);
    };
  }, [loadCart]); // Include loadCart in dependencies
  
  // Load user's saved address and details (and listen for login/logout/profile updates)
  const loadUserDetails = React.useCallback(async () => {
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
      // Clear profile fields when not logged in
      // (optional) Comment out if you prefer to keep last-known values
      // setUserAddress("");
      // setUserPhone("");
      // setFirstName("");
      // setEmail("");
    }
  }, []);

  useEffect(() => {
    // Run once to populate profile fields
    loadUserDetails();

    // Handlers need to be stable for removeEventListener -> define inside effect
    const handleUserUpdate = () => {
      loadUserDetails();
    };

    const handleUserLoginForCart = () => {
      // When user logs in, reload cart (restores saved cart)
      loadCart();
      // Also reload user details
      loadUserDetails();
    };

    window.addEventListener('userLogin', handleUserUpdate);
    window.addEventListener('userLogout', handleUserUpdate);
    window.addEventListener('userLogin', handleUserLoginForCart);

    return () => {
      window.removeEventListener('userLogin', handleUserUpdate);
      window.removeEventListener('userLogout', handleUserUpdate);
      window.removeEventListener('userLogin', handleUserLoginForCart);
    };
  }, [loadUserDetails, loadCart]);

  // Orders-only effect (Option B): fetch orders and listen for updates + auth changes
  useEffect(() => {
    let mounted = true;

    const loadOrders = async () => {
      if (mounted) setLoadingOrders(true);
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const ordersRes = await api.get('/orders', { headers: authHeader() });
          if (mounted) setOrders(ordersRes.data || []);
        } else {
          if (mounted) setOrders([]);
        }
      } catch (err) {
        console.log("Could not load orders:", err);
        if (mounted) setOrders([]);
      } finally {
        if (mounted) setLoadingOrders(false);
      }
    };

    // Initial load
    loadOrders();

    // Respond to external order updates (seller dashboard, webhooks, etc.)
    const handleOrderStatusUpdate = () => loadOrders();
    const handleUserLogin = () => loadOrders(); // reload when user logs in
    const handleUserLogout = () => {
      // clear orders on logout
      setOrders([]);
      setLoadingOrders(false);
    };

    window.addEventListener('orderStatusUpdated', handleOrderStatusUpdate);
    window.addEventListener('userLogin', handleUserLogin);
    window.addEventListener('userLogout', handleUserLogout);

    return () => {
      mounted = false;
      window.removeEventListener('orderStatusUpdated', handleOrderStatusUpdate);
      window.removeEventListener('userLogin', handleUserLogin);
      window.removeEventListener('userLogout', handleUserLogout);
    };
  }, []); // run once on mount

  const updateCart = async (c, skipReload = false) => {
    setCart(c);
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userId = user?.id;
    const cartKey = userId ? `cart_${userId}` : 'cart';
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
                description: product.description || '',
                title: product.title || item.title || ''
              };
            } catch (err) {
              console.error(`Failed to load product ${item.productId}:`, err);
              return {
                ...item,
                product: null,
                discount: 0,
                imageUrl: null,
                description: '',
                title: item.title || ''
              };
            }
          })
        );
        setCartItems(itemsWithDetails);
      } catch (err) {
        console.error("Failed to load cart products:", err);
        setCartItems(c.map(item => ({ ...item, product: null, discount: 0, imageUrl: null, description: '', title: item.title || '' })));
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
        showModal(`Maximum ${maxQuantity} items allowed for this product.`, "Quantity Limit", "warning");
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
      showModal("Your cart is empty!", "Empty Cart", "warning");
      return;
    }

    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      showModal("Please log in to proceed with checkout", "Login Required", "warning");
      navigate("/login");
      return;
    }

    // Validate address and phone from profile
    if (!userAddress.trim()) {
      showModal("Please set your address in profile settings before checkout", "Address Required", "warning");
      return;
    }

    if (!userPhone.trim()) {
      showModal("Please set your phone number in profile settings before checkout", "Phone Required", "warning");
      return;
    }

    if (!firstName.trim() || !email.trim()) {
      showModal("Please fill in all required details (Name, Email)", "Details Required", "warning");
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
        { 
          items, 
          address: userAddress, 
          firstName, 
          email, 
          phone: userPhone,
          scheduledPickupTime: scheduledPickupTime || null
        },
        { headers: authHeader() }
      );

      const { paymentUrl, paymentParams, txnId } = paymentRes.data;

      // Store order details in sessionStorage for verification
      sessionStorage.setItem('pendingOrder', JSON.stringify({
        txnId,
        items,
        address: userAddress,
        scheduledPickupTime: scheduledPickupTime || null,
        isWholesale: false, // Explicitly mark as regular cart order
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
      // Remove form after submission to prevent issues
      setTimeout(() => {
        if (document.body.contains(form)) {
          document.body.removeChild(form);
        }
      }, 1000);
    } catch (err) {
      console.error("Checkout error:", err);
      showModal(
        err.response?.data?.error ||
          "Failed to initiate payment. Please try again.",
        "Payment Error",
        "error"
      );
      setLoading(false);
    }
  };

  // Separate orders into current (undelivered) and previous (delivered)
  // Include orders with trackingStatus === 'delivered' in previous orders
  const currentOrders = orders.filter(order => {
    const isDelivered = order.status === 'delivered' || order.status === 'fulfilled';
    const isTrackingDelivered = order.trackingStatus === 'delivered';
    const isCancelled = order.status === 'cancelled';
    return !isDelivered && !isTrackingDelivered && !isCancelled;
  });
  const previousOrders = orders.filter(order => {
    const isDelivered = order.status === 'delivered' || order.status === 'fulfilled';
    const isTrackingDelivered = order.trackingStatus === 'delivered';
    return isDelivered || isTrackingDelivered;
  });

  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const markOrderReceived = async (orderId) => {
    try {
      const res = await api.put(
        `/orders/${orderId}/mark-received`,
        {},
        { headers: authHeader() }
      );
      
      // Reload orders to get updated tracking status
      const ordersRes = await api.get('/orders', { headers: authHeader() });
      setOrders(ordersRes.data || []);
      
      showModal('Order receipt confirmed', 'Success', 'success');
    } catch (err) {
      console.error('Failed to mark order as received:', err);
      showModal(err.response?.data?.error || 'Failed to confirm receipt', 'Error', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="App">
      <ModalComponent />
      <h2>Your Cart</h2>

      {loadingProducts && <p>Loading cart items...</p>}

      {!loadingProducts && cart.length === 0 && <p>No items in cart.</p>}

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
                  borderRadius: "10px",
                  padding: "12px",
                  backgroundColor: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  position: "relative"
                }}
              >
                {/* Clickable wrapper for entire card except quantity controls and remove button */}
                <Link 
                  to={`/product/${item.productId}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: "100px", // Leave space for quantity controls and remove button
                    zIndex: 1,
                    cursor: "pointer"
                  }}
                  onClick={(e) => {
                    // Don't navigate if clicking on buttons
                    const target = e.target;
                    if (target.closest && target.closest('button')) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                />

                {/* Product Image */}
                {item.imageUrl && (
                  <img
                    src={`http://localhost:4000${item.imageUrl}`}
                    alt={item.title}
                    style={{
                      width: "100%",
                      height: "160px",
                      objectFit: "cover",
                      borderRadius: "6px",
                      pointerEvents: "none"
                    }}
                  />
                )}

                {/* Product Title */}
                <h3 style={{ margin: 0, color: "#333", fontSize: "16px", fontWeight: "600", pointerEvents: "none" }}>
                  {item.title}
                </h3>

                {/* Description */}
                {item.description && (
                  <p style={{ 
                    margin: 0, 
                    color: "#666", 
                    fontSize: "14px",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    pointerEvents: "none"
                  }}>
                    {item.description}
                  </p>
                )}

                {/* Price Information */}
                <div style={{ marginTop: "auto", pointerEvents: "none" }}>
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
                  marginTop: "8px",
                  position: "relative",
                  zIndex: 2
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      decrement(item.productId);
                    }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      increment(item.productId);
                    }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.productId);
                  }}
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
                    transition: "background 0.2s",
                    position: "relative",
                    zIndex: 2
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
              <p style={{ marginBottom: 5 }}>Name (for order processing): *</p>
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
              <p style={{ marginBottom: 5 }}>Email (for payment processing): *</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                style={{ width: "100%", padding: "8px", marginBottom: 10 }}
                required
              />
            </div>

            <div style={{ marginTop: 15 }}>
              <p style={{ marginBottom: 5 }}>Schedule Pickup (Optional):</p>
              <input
                type="date"
                value={scheduledPickupTime}
                onChange={(e) => setScheduledPickupTime(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                style={{ 
                  width: "100%", 
                  padding: "8px", 
                  marginBottom: 10,
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6b7280" }}>
                Select a date for store pickup. Leave empty for immediate processing.
              </p>
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

      {/* Orders Section */}
      {!loadingOrders && (
        <>
          {/* Current Orders (Undelivered) */}
          {currentOrders.length > 0 && (
            <div style={{ marginTop: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', cursor: 'pointer' }} onClick={() => setCurrentOrdersExpanded(!currentOrdersExpanded)}>
                <h2 style={{ margin: 0 }}>Orders ({currentOrders.length})</h2>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: '0',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentOrdersExpanded(!currentOrdersExpanded);
                  }}
                >
                  {currentOrdersExpanded ? '−' : '+'}
                </button>
              </div>
              {currentOrdersExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {currentOrders.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                          Order #{order.id}
                        </h3>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#6b7280' }}>
                          Ordered on: {formatDate(order.createdAt)}
                        </p>
                        {order.paymentOrderId && (
                          <p style={{ margin: '4px 0', fontSize: '13px', color: '#6b7280' }}>
                            Transaction ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{order.paymentOrderId}</span>
                          </p>
                        )}
                        {order.scheduledPickupTime && (
                          <div style={{ 
                            margin: '8px 0', 
                            padding: '8px 12px', 
                            backgroundColor: '#dbeafe', 
                            borderRadius: '6px',
                            border: '1px solid #93c5fd',
                            display: 'inline-block'
                          }}>
                            <p style={{ margin: 0, fontSize: '14px', color: '#1e40af', fontWeight: 600 }}>
                              📅 Store Pickup: {formatDateOnly(order.scheduledPickupTime)}
                            </p>
                          </div>
                        )}
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#6b7280' }}>
                          Status: <span style={{ 
                            color: order.status === 'confirmed' ? '#059669' : '#dc2626',
                            fontWeight: 600
                          }}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </p>
                        {/* Tracking Status - Show delivery status for regular orders, pickup status for store pickup */}
                        {order.scheduledPickupTime ? (
                          <div style={{ 
                            margin: '8px 0', 
                            padding: '8px 12px', 
                            backgroundColor: (order.trackingStatus === 'delivered') ? '#d1fae5' : '#f3f4f6',
                            borderRadius: '6px',
                            border: `1px solid ${(order.trackingStatus === 'delivered') ? '#10b981' : '#d1d5db'}`,
                            display: 'inline-block'
                          }}>
                            <p style={{ margin: 0, fontSize: '14px', color: (order.trackingStatus === 'delivered') ? '#065f46' : '#374151', fontWeight: 600 }}>
                              {(order.trackingStatus === 'delivered') ? '✓ Picked Up' : '📦 Pending Pickup'}
                            </p>
                            {order.deliveredAt && (
                              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                                Picked up: {formatDate(order.deliveredAt)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div style={{ 
                            margin: '8px 0', 
                            padding: '8px 12px', 
                            backgroundColor: (order.trackingStatus === 'out_for_delivery') ? '#fef3c7' : (order.trackingStatus === 'delivered') ? '#d1fae5' : '#f3f4f6',
                            borderRadius: '6px',
                            border: `1px solid ${(order.trackingStatus === 'out_for_delivery') ? '#fbbf24' : (order.trackingStatus === 'delivered') ? '#10b981' : '#d1d5db'}`,
                            display: 'inline-block'
                          }}>
                            <p style={{ margin: 0, fontSize: '14px', color: (order.trackingStatus === 'out_for_delivery') ? '#92400e' : (order.trackingStatus === 'delivered') ? '#065f46' : '#374151', fontWeight: 600 }}>
                              {(order.trackingStatus === 'out_for_delivery') ? '🚚 Out for Delivery' : (order.trackingStatus === 'delivered') ? '✓ Delivered' : '📦 Pending Delivery'}
                            </p>
                            {order.outForDelivery && (
                              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                                Out: {formatDate(order.outForDelivery)}
                              </p>
                            )}
                            {order.deliveredAt && (
                              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                                Delivered: {formatDate(order.deliveredAt)}
                              </p>
                            )}
                          </div>
                        )}
                        {/* Delivery Person Information */}
                        {order.deliveryPerson && !order.scheduledPickupTime && (
                          <div style={{ 
                            margin: '8px 0', 
                            padding: '8px 12px', 
                            backgroundColor: '#eff6ff',
                            borderRadius: '6px',
                            border: '1px solid #bfdbfe',
                            display: 'inline-block'
                          }}>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1e40af' }}>
                              🚚 Delivery Person:
                            </p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#1e3a8a' }}>
                              {order.deliveryPerson.name || order.deliveryPerson.email}
                            </p>
                            {order.deliveryPerson.phone && (
                              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#3b82f6' }}>
                                📞 {order.deliveryPerson.phone}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                          ₹{parseFloat(order.total).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div style={{ marginTop: '10px' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 600 }}>Items:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {order.items?.map((item) => (
                          <div key={item.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {item.product?.imageUrl || (item.product?.images && item.product.images[0]) ? (
                              <img
                                src={`http://localhost:4000${item.product.imageUrl || item.product.images[0]}`}
                                alt={item.product?.title}
                                style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '4px' }}
                              />
                            ) : null}
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>
                                {item.product?.title || 'Product'}
                              </p>
                              <p style={{ margin: '2px 0', fontSize: '11px', color: '#6b7280' }}>
                                Qty: {item.quantity} × ₹{(() => {
                                  const unitPrice = parseFloat(item.unitPrice) || 0;
                                  return unitPrice.toFixed(2);
                                })()} = ₹{(() => {
                                  const subtotal = parseFloat(item.subtotal) || 0;
                                  return subtotal.toFixed(2);
                                })()}
                              </p>
                              {order.scheduledPickupTime && (
                                <p style={{ margin: '2px 0', fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
                                  📅 Store Pickup: {formatDateOnly(order.scheduledPickupTime)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mark Received button for consumers - Only for delivered orders (delivery person already marked it) */}
                    {order.trackingStatus === 'delivered' && order.deliveryType === 'retailer_to_consumer' && !order.scheduledPickupTime && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ 
                          padding: '12px', 
                          backgroundColor: '#f0fdf4', 
                          borderRadius: '6px', 
                          border: '1px solid #86efac',
                          marginBottom: '12px'
                        }}>
                          <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 600, color: '#166534' }}>
                            ✓ Order Delivered
                          </p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#374151' }}>
                            Your order has been delivered. Please confirm receipt.
                          </p>
                        </div>
                        <button
                          onClick={() => markOrderReceived(order.id)}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600,
                            transition: 'background 0.2s',
                            width: '100%'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
                        >
                          Confirm Receipt
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                </div>
              )}
            </div>
          )}

          {/* Previous Orders (Delivered) */}
          {previousOrders.length > 0 && (
            <div style={{ marginTop: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', cursor: 'pointer' }} onClick={() => setPreviousOrdersExpanded(!previousOrdersExpanded)}>
                <h2 style={{ margin: 0 }}>Previous Orders ({previousOrders.length})</h2>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: '0',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviousOrdersExpanded(!previousOrdersExpanded);
                  }}
                >
                  {previousOrdersExpanded ? '−' : '+'}
                </button>
              </div>
              {previousOrdersExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {previousOrders.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: '#f9fafb'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                          Order #{order.id}
                        </h3>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#6b7280' }}>
                          Ordered on: {formatDate(order.createdAt)}
                        </p>
                        {order.paymentOrderId && (
                          <p style={{ margin: '4px 0', fontSize: '13px', color: '#6b7280' }}>
                            Transaction ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{order.paymentOrderId}</span>
                          </p>
                        )}
                        {order.scheduledPickupTime && (
                          <div style={{ 
                            margin: '8px 0', 
                            padding: '8px 12px', 
                            backgroundColor: '#dbeafe', 
                            borderRadius: '6px',
                            border: '1px solid #93c5fd',
                            display: 'inline-block'
                          }}>
                            <p style={{ margin: 0, fontSize: '14px', color: '#1e40af', fontWeight: 600 }}>
                              📅 Store Pickup: {formatDateOnly(order.scheduledPickupTime)}
                            </p>
                          </div>
                        )}
                        {/* Tracking Status - Show delivery status for regular orders, pickup status for store pickup */}
                        {order.scheduledPickupTime ? (
                          <div style={{ 
                            margin: '8px 0', 
                            padding: '8px 12px', 
                            backgroundColor: (order.trackingStatus === 'delivered') ? '#d1fae5' : '#f3f4f6',
                            borderRadius: '6px',
                            border: `1px solid ${(order.trackingStatus === 'delivered') ? '#10b981' : '#d1d5db'}`,
                            display: 'inline-block'
                          }}>
                            <p style={{ margin: 0, fontSize: '14px', color: (order.trackingStatus === 'delivered') ? '#065f46' : '#374151', fontWeight: 600 }}>
                              {(order.trackingStatus === 'delivered') ? '✓ Picked Up' : '📦 Pending Pickup'}
                            </p>
                            {order.deliveredAt && (
                              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                                Picked up: {formatDate(order.deliveredAt)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div style={{ 
                            margin: '8px 0', 
                            padding: '8px 12px', 
                            backgroundColor: (order.trackingStatus === 'out_for_delivery') ? '#fef3c7' : (order.trackingStatus === 'delivered') ? '#d1fae5' : '#f3f4f6',
                            borderRadius: '6px',
                            border: `1px solid ${(order.trackingStatus === 'out_for_delivery') ? '#fbbf24' : (order.trackingStatus === 'delivered') ? '#10b981' : '#d1d5db'}`,
                            display: 'inline-block'
                          }}>
                            <p style={{ margin: 0, fontSize: '14px', color: (order.trackingStatus === 'out_for_delivery') ? '#92400e' : (order.trackingStatus === 'delivered') ? '#065f46' : '#374151', fontWeight: 600 }}>
                              {(order.trackingStatus === 'out_for_delivery') ? '🚚 Out for Delivery' : (order.trackingStatus === 'delivered') ? '✓ Delivered' : '📦 Pending Delivery'}
                            </p>
                            {order.outForDelivery && (
                              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                                Out: {formatDate(order.outForDelivery)}
                              </p>
                            )}
                            {order.deliveredAt && (
                              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                                Delivered: {formatDate(order.deliveredAt)}
                              </p>
                            )}
                          </div>
                        )}
                        {/* Delivery Person Information */}
                        {order.deliveryPerson && !order.scheduledPickupTime && (
                          <div style={{ 
                            margin: '8px 0', 
                            padding: '8px 12px', 
                            backgroundColor: '#eff6ff',
                            borderRadius: '6px',
                            border: '1px solid #bfdbfe',
                            display: 'inline-block'
                          }}>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1e40af' }}>
                              🚚 Delivery Person:
                            </p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#1e3a8a' }}>
                              {order.deliveryPerson.name || order.deliveryPerson.email}
                            </p>
                            {order.deliveryPerson.phone && (
                              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#3b82f6' }}>
                                📞 {order.deliveryPerson.phone}
                              </p>
                            )}
                          </div>
                        )}
                        {order.status === 'delivered' && (
                          <p style={{ margin: '4px 0', fontSize: '14px', color: '#059669', fontWeight: 600 }}>
                            ✓ Delivered
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                          ₹{(() => {
                            // Calculate total from items if order.total is missing or invalid
                            if (order.total && !isNaN(parseFloat(order.total))) {
                              return parseFloat(order.total).toFixed(2);
                            }
                            // Fallback: calculate from order items
                            const calculatedTotal = order.items?.reduce((sum, item) => {
                              const subtotal = parseFloat(item.subtotal) || 0;
                              return sum + subtotal;
                            }, 0) || 0;
                            return calculatedTotal.toFixed(2);
                          })()}
                        </p>
                      </div>
                    </div>

                    <div style={{ marginTop: '10px' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 600 }}>Items:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {order.items?.map((item) => (
                          <div key={item.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {item.product?.imageUrl || (item.product?.images && item.product.images[0]) ? (
                              <img
                                src={`http://localhost:4000${item.product.imageUrl || item.product.images[0]}`}
                                alt={item.product?.title}
                                style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '4px' }}
                              />
                            ) : null}
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>
                                {item.product?.title || 'Product'}
                              </p>
                              <p style={{ margin: '2px 0', fontSize: '11px', color: '#6b7280' }}>
                                Qty: {item.quantity} × ₹{(() => {
                                  const unitPrice = parseFloat(item.unitPrice) || 0;
                                  return unitPrice.toFixed(2);
                                })()} = ₹{(() => {
                                  const subtotal = parseFloat(item.subtotal) || 0;
                                  return subtotal.toFixed(2);
                                })()}
                              </p>
                              {order.scheduledPickupTime && (
                                <p style={{ margin: '2px 0', fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
                                  📅 Store Pickup: {formatDateOnly(order.scheduledPickupTime)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))} 
                </div>
              )}
            </div>
          )}

          {currentOrders.length === 0 && previousOrders.length === 0 && (
            <div style={{ marginTop: '40px', textAlign: 'center', padding: '40px' }}>
              <p style={{ fontSize: '16px', color: '#6b7280' }}>No orders yet</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
