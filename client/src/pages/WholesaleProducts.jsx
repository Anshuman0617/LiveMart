// client/src/pages/WholesaleProducts.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { api, authHeader } from "../api";
import { Link } from "react-router-dom";
import debounce from "lodash.debounce";
import { personalizeProductList, generateRecommendations } from "../utils/recommendations.js";
import { useModal } from "../hooks/useModal";

export default function WholesaleProducts() {
  const { showModal, ModalComponent } = useModal();
  const [products, setProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [quantity, setQuantity] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxDistanceKm, setMaxDistanceKm] = useState(45); // Default 45km (used for API calls)
  const [maxDistanceDisplay, setMaxDistanceDisplay] = useState("45"); // Display value (can be cleared)
  const [sort, setSort] = useState("");
  const [category, setCategory] = useState("all");

  const [latLng, setLatLng] = useState(null);
  const hasInitiallyFetchedRef = useRef(false);

  const fetchProducts = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/products", { 
        params: { ...params, ownerType: "wholesaler" } 
      });
      const productsList = res.data.products || [];
      
      // Sort products: out-of-stock items last
      const sortedProducts = productsList.sort((a, b) => {
        const aOutOfStock = a.stock !== undefined && a.stock !== null && a.stock <= 0;
        const bOutOfStock = b.stock !== undefined && b.stock !== null && b.stock <= 0;
        
        // If both are out of stock or both are in stock, maintain original order
        if (aOutOfStock === bOutOfStock) return 0;
        // If a is out of stock and b is not, a comes after b
        if (aOutOfStock) return 1;
        // If b is out of stock and a is not, b comes after a
        return -1;
      });
      
      setProducts(sortedProducts);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError(err.response?.data?.error || 'Failed to load wholesale products. Please try again.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce((params) => fetchProducts(params), 300),
    [fetchProducts]
  );

  // Load user's saved location on mount and when user updates
  const loadUserProfile = useCallback(async () => {
    try {
      const res = await api.get("/users/me");
      const user = res.data;
      if (user.lat != null && user.lng != null) {
        const newLatLng = { lat: Number(user.lat), lng: Number(user.lng) };
        setLatLng(newLatLng);
        return newLatLng;
      }
    } catch (err) {
      console.log("Could not load user profile:", err);
    }
    return null;
  }, []);

  // Load user orders for personalization
  const loadOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const ordersRes = await api.get('/orders', { headers: authHeader() });
        setOrders(ordersRes.data || []);
      }
    } catch (err) {
      // User not logged in or error - that's okay
      console.log("Could not load orders for personalization:", err);
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    loadUserProfile();
    loadOrders();
  }, [loadUserProfile, loadOrders]);

  // Listen for userLogin event to reload location when address is updated
  useEffect(() => {
    const handleUserLogin = async () => {
      const newLatLng = await loadUserProfile();
      // If location was updated, refetch products with new location
      if (newLatLng && hasInitiallyFetchedRef.current) {
        const params = {};
        if (q) params.q = q;
        if (minPrice) params.minPrice = minPrice;
        if (maxPrice) params.maxPrice = maxPrice;
        if (sort) params.sort = sort;
        if (category && category !== 'all') params.category = category;
        params.lat = newLatLng.lat;
        params.lng = newLatLng.lng;
        params.maxDistanceKm = maxDistanceKm || 45; // Default 45km
        fetchProducts(params);
      }
    };

    window.addEventListener('userLogin', handleUserLogin);
    return () => {
      window.removeEventListener('userLogin', handleUserLogin);
    };
  }, [loadUserProfile, fetchProducts, q, minPrice, maxPrice, sort, category, maxDistanceKm]);

  // Initial fetch on mount
  useEffect(() => {
    if (!hasInitiallyFetchedRef.current) {
      hasInitiallyFetchedRef.current = true;
      const initialParams = {};
      // If user has location, include it with default 45km distance
      if (latLng && latLng.lat != null && latLng.lng != null) {
        initialParams.lat = latLng.lat;
        initialParams.lng = latLng.lng;
        initialParams.maxDistanceKm = 45;
      }
      fetchProducts(initialParams);
    }
  }, [fetchProducts, latLng]);

  // Fetch products when filters or location change (debounced)
  useEffect(() => {
    // Skip if we haven't done the initial fetch yet
    if (!hasInitiallyFetchedRef.current) {
      return;
    }

    const params = {};
    if (q) params.q = q;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (sort) params.sort = sort;
    if (category && category !== 'all') params.category = category;
    // Always include maxDistanceKm when location is set (default 45km)
    if (latLng) {
      params.lat = latLng.lat;
      params.lng = latLng.lng;
      params.maxDistanceKm = maxDistanceKm || 45;
    }
    
    // Use debounced search for filter changes
    debouncedSearch(params);
  }, [q, minPrice, maxPrice, sort, category, maxDistanceKm, latLng, debouncedSearch]);

  const useMyLocation = async () => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLatLng = { lat: Number(pos.coords.latitude), lng: Number(pos.coords.longitude) };
        setLatLng(newLatLng);
        
        // Save only lat/lng to user profile (not address) - address will override this when set
        try {
          await api.put("/users/me", {
            lat: newLatLng.lat,
            lng: newLatLng.lng,
          }, { headers: authHeader() });
          showModal("Location saved! This will be used for distance calculations.", "Location Saved", "success");
        } catch (err) {
          console.error("Failed to save location:", err);
          showModal("Failed to save location. Please try again.", "Error", "error");
        }
      },
      () => showModal("Failed to access location", "Location Error", "error")
    );
  };

  const addToRetailerList = async (productId) => {
    try {
      const res = await api.post(`/products/${productId}/add-to-retailer-list`, {}, {
        headers: authHeader()
      });
      showModal(res.data.message || "Product added to your product list!", "Success", "success");
    } catch (err) {
      console.error("Failed to add product to list:", err);
      showModal(err.response?.data?.error || "Failed to add product to your list. Please try again.", "Error", "error");
    }
  };

  const addToWholesaleCart = (productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    // Check if product is out of stock
    if (product.stock !== undefined && product.stock !== null && product.stock <= 0) {
      showModal("This product is out of stock!", "Out of Stock", "warning");
      return;
    }

    const numMultiples = parseInt(quantity[productId] || 1, 10); // Number of multiples user wants to order
    if (numMultiples < 1) {
      showModal("Quantity must be at least 1", "Invalid Quantity", "warning");
      return;
    }

    const multiples = product.multiples || 1;
    const maxMultiples = product.stock || 0; // Stock is in multiples
    const totalUnitsAvailable = maxMultiples * multiples; // Total units available
    const totalUnitsOrdered = numMultiples * multiples; // Total units user wants to order
    
    // Validate that user doesn't exceed available stock (in multiples)
    if (numMultiples > maxMultiples) {
      showModal(`Only ${maxMultiples} multiple${maxMultiples !== 1 ? 's' : ''} (${totalUnitsAvailable} units) available in stock.`, "Stock Limit", "warning");
      setQuantity({ ...quantity, [productId]: "" });
      return;
    }

    // Get user-specific wholesale cart
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userId = user?.id;
    const cartKey = userId ? `wholesaleCart_${userId}` : 'wholesaleCart';
    const cart = JSON.parse(localStorage.getItem(cartKey) || "[]");
    const existing = cart.find((c) => c.productId === productId);

    if (existing) {
      // existing.quantity is in units, existing.multiples is the size
      const existingUnits = existing.quantity || 0;
      const newTotalUnits = existingUnits + totalUnitsOrdered;
      const newTotalMultiples = newTotalUnits / multiples;
      
      // Check if new total is a valid multiple
      if (newTotalUnits % multiples !== 0) {
        const nextValidUnits = Math.ceil(newTotalUnits / multiples) * multiples;
        const nextValidMultiples = nextValidUnits / multiples;
        if (nextValidMultiples > maxMultiples) {
          showModal(`Cannot add ${numMultiples} multiple${numMultiples !== 1 ? 's' : ''} (${totalUnitsOrdered} units). The total quantity would be ${newTotalUnits} units, which is not a multiple of ${multiples}. The next valid quantity (${nextValidUnits} units = ${nextValidMultiples} multiples) exceeds available stock (${maxMultiples} multiples = ${totalUnitsAvailable} units).`, "Stock Limit Exceeded", "warning");
          setQuantity({ ...quantity, [productId]: "" });
          return;
        }
        showModal(`Adding ${numMultiples} multiple${numMultiples !== 1 ? 's' : ''} (${totalUnitsOrdered} units) would result in ${newTotalUnits} total units, which is not a multiple of ${multiples}. Adjusting to ${nextValidUnits} units (${nextValidMultiples} multiples).`, "Quantity Adjusted", "info");
        existing.quantity = nextValidUnits;
      } else if (newTotalMultiples > maxMultiples) {
        showModal(`Only ${maxMultiples} multiple${maxMultiples !== 1 ? 's' : ''} (${totalUnitsAvailable} units) available in stock. You already have ${existingUnits} units (${existingUnits / multiples} multiples) in your cart.`, "Stock Limit", "warning");
        setQuantity({ ...quantity, [productId]: "" });
        return;
      } else {
        existing.quantity = newTotalUnits;
      }
    } else {
      cart.push({
        productId: product.id,
        title: product.title,
        price: product.price,
        quantity: totalUnitsOrdered, // Store as actual units
        multiples: multiples, // Store the size of each multiple
      });
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));
    showModal("Added to wholesale cart!", "Success", "success");
    // Reset quantity input
    setQuantity({ ...quantity, [productId]: "" });
  };

  return (
    <div className="App">
      <ModalComponent />
      <h1>Wholesale Products</h1>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Browse wholesale products from wholesalers. Add items to your wholesale cart to purchase.
      </p>

      {/* Filters */}
      <div style={{ 
        display: "flex", 
        flexWrap: "wrap", 
        gap: "16px", 
        marginBottom: 20,
        alignItems: "flex-end"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "14px", fontWeight: 500, color: "#374151", lineHeight: "20px", height: "20px" }}>
            Search
          </label>
          <input
            placeholder="Search products..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ 
              maxWidth: 300,
              height: "36px",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "14px", fontWeight: 500, color: "#374151", lineHeight: "20px", height: "20px" }}>
            Min Price (₹)
          </label>
          <input
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            type="number"
            min="0"
            style={{ 
              maxWidth: 140,
              height: "36px",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "14px", fontWeight: 500, color: "#374151", lineHeight: "20px", height: "20px" }}>
            Max Price (₹)
          </label>
          <input
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            type="number"
            min="0"
            style={{ 
              maxWidth: 140,
              height: "36px",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "14px", fontWeight: 500, color: "#374151", lineHeight: "20px", height: "20px" }}>
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ 
              maxWidth: 200,
              height: "36px",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              cursor: "pointer",
              boxSizing: "border-box"
            }}
          >
            <option value="all">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Fashion and Apparel">Fashion and Apparel</option>
            <option value="Home Goods">Home Goods</option>
            <option value="Beauty and Personal Care">Beauty and Personal Care</option>
            <option value="Food and Beverages">Food and Beverages</option>
            <option value="Toys and Hobbies">Toys and Hobbies</option>
            <option value="Health and Wellness">Health and Wellness</option>
            <option value="Pet Supplies">Pet Supplies</option>
            <option value="DIY and Hardware">DIY and Hardware</option>
            <option value="Media">Media</option>
            <option value="Others">Others</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "14px", fontWeight: 500, color: "#374151", lineHeight: "20px", height: "20px" }}>
            Sort By
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ 
              maxWidth: 150,
              height: "36px",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              cursor: "pointer",
              boxSizing: "border-box"
            }}
          >
            <option value="">None</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
            <option value="most_sold">Most Sold</option>
            <option value="distance">Closest</option>
            <option value="discounted">Discounted</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "14px", fontWeight: 500, color: "#374151", lineHeight: "20px", height: "20px" }}>
            Location
          </label>
          <button 
            onClick={useMyLocation}
            style={{
              height: "36px",
              padding: "8px 16px",
              backgroundColor: "#3399cc",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              cursor: "pointer",
              fontWeight: 500,
              whiteSpace: "nowrap",
              boxSizing: "border-box"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#2a7ba0"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#3399cc"}
          >
            Use My Location
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px", position: "relative" }}>
          <label style={{ fontSize: "14px", fontWeight: 500, color: "#374151", lineHeight: "20px", height: "20px" }}>
            Max Distance (km)
          </label>
          <input
            placeholder="45"
            value={maxDistanceDisplay}
            onChange={(e) => {
              const value = e.target.value;
              // Allow empty string or digits only
              if (value === '' || /^\d+$/.test(value)) {
                setMaxDistanceDisplay(value);
                // Update the actual filter value (use 45 if empty)
                if (value === '') {
                  setMaxDistanceKm(45);
                } else {
                  const numValue = Number(value);
                  // Enforce maximum of 75km and minimum of 1km
                  if (numValue > 75) {
                    setMaxDistanceKm(75);
                    setMaxDistanceDisplay("75");
                  } else if (numValue < 1) {
                    setMaxDistanceKm(1);
                    setMaxDistanceDisplay("1");
                  } else {
                    setMaxDistanceKm(numValue);
                  }
                }
              }
            }}
            onBlur={(e) => {
              // When field loses focus, if empty, reset to 45
              if (e.target.value === '') {
                setMaxDistanceDisplay("45");
                setMaxDistanceKm(45);
              } else {
                const numValue = Number(e.target.value);
                if (numValue < 1) {
                  setMaxDistanceDisplay("1");
                  setMaxDistanceKm(1);
                } else if (numValue > 75) {
                  setMaxDistanceDisplay("75");
                  setMaxDistanceKm(75);
                }
              }
            }}
            type="text"
            inputMode="numeric"
            style={{ 
              maxWidth: 150,
              height: "36px",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              boxSizing: "border-box"
            }}
          />
          <span style={{ fontSize: "12px", color: "#6b7280", position: "absolute", top: "60px", whiteSpace: "nowrap" }}>
            Range: 1-75 km (default: 45 km)
          </span>
        </div>
        
        {latLng && latLng.lat != null && latLng.lng != null && (
          <div style={{ 
            display: "flex", 
            flexDirection: "column",
            justifyContent: "flex-end"
          }}>
            <label style={{ fontSize: "14px", fontWeight: 500, color: "#374151", lineHeight: "20px", height: "20px", opacity: 0 }}>
              &nbsp;
            </label>
            <p style={{ margin: 0, color: "#666", fontSize: "0.9em", height: "36px", display: "flex", alignItems: "center" }}>
              📍 Location: {Number(latLng.lat).toFixed(4)}, {Number(latLng.lng).toFixed(4)}
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#fee2e2', 
          color: '#dc2626', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Loading wholesale products...</p>
        </div>
      )}

      {/* Recommendations Section */}
      {!loading && !error && recommendedProducts.length > 0 && showRecommendations && (
        <div style={{ marginBottom: '50px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#3b82f6' }}>
              ⭐ Recommended for You
            </h2>
            <button
              onClick={() => setShowRecommendations(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '14px',
                color: '#6b7280',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Hide
            </button>
          </div>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
            gap: "20px"
          }}>
            {recommendedProducts.map((p) => {
              const firstImage = (p.images && p.images.length > 0) ? p.images[0] : p.imageUrl;
              const multiples = p.multiples || 1;
              const pricePerMultiple = parseFloat(p.price || 0) * multiples;
              
              return (
                <div 
                  key={p.id} 
                  style={{
                    border: "2px solid #3b82f6",
                    borderRadius: "12px",
                    padding: "16px",
                    backgroundColor: "#fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    position: "relative",
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                  }}
                >
                  {/* Clickable wrapper for entire card except input/button */}
                  <Link 
                    to={`/product/${p.id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: "80px", // Leave space for quantity input and button
                      zIndex: 1
                    }}
                  />
                  {firstImage && (
                    <img
                      src={`http://localhost:4000${firstImage}`}
                      alt={p.title}
                      style={{
                        width: "100%",
                        height: "200px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        position: "relative",
                        zIndex: 0
                      }}
                    />
                  )}
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, position: "relative", zIndex: 0 }}>
                    {p.title}
                  </h3>
                  <p style={{ margin: 0, color: "#666", fontSize: "14px", position: "relative", zIndex: 0 }}>
                    {p.description?.substring(0, 100)}...
                  </p>
                  <div style={{ position: "relative", zIndex: 0 }}>
                    <span style={{ fontSize: "20px", fontWeight: 600 }}>
                      ₹{pricePerMultiple.toFixed(2)}
                    </span>
                    <p style={{ margin: "4px 0", fontSize: "14px", color: "#6b7280" }}>
                      ₹{parseFloat(p.price || 0).toFixed(2)} per unit (×{multiples})
                    </p>
                  </div>
                  <p style={{ margin: 0, fontSize: "14px", color: p.stock > 0 ? "#059669" : "#dc2626", position: "relative", zIndex: 0 }}>
                    Stock: {p.stock || 0} multiples ({(p.stock || 0) * multiples} units)
                  </p>
                  {/* Availability date for out-of-stock items */}
                  {p.stock <= 0 && p.availabilityDate && (
                    <p style={{ margin: "4px 0", fontSize: "13px", color: "#2563eb", fontWeight: 600, position: "relative", zIndex: 0 }}>
                      📅 Back in stock: {new Date(p.availabilityDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                  {/* Quantity Input and Add to Cart Button */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", position: "relative", zIndex: 2, marginTop: "auto" }}>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="No. of multiples"
                      value={quantity[p.id] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^\d+$/.test(val)) {
                          setQuantity({ ...quantity, [p.id]: val });
                        }
                      }}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setQuantity({ ...quantity, [p.id]: "" });
                          return;
                        }
                        const numVal = parseInt(val);
                        const maxMultiples = p.stock || 0;
                        
                        if (numVal < 1) {
                          setQuantity({ ...quantity, [p.id]: "" });
                          return;
                        }
                        if (numVal > maxMultiples) {
                          showModal(`Only ${maxMultiples} multiple${maxMultiples !== 1 ? 's' : ''} available in stock.`, "Stock Limit", "warning");
                          setQuantity({ ...quantity, [p.id]: "" });
                          return;
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        fontSize: "14px"
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        addToWholesaleCart(p.id);
                      }}
                      disabled={p.stock !== undefined && p.stock !== null && p.stock <= 0}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: (p.stock !== undefined && p.stock !== null && p.stock <= 0) ? "#9ca3af" : "#3399cc",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: (p.stock !== undefined && p.stock !== null && p.stock <= 0) ? "not-allowed" : "pointer",
                        fontSize: "16px",
                        fontWeight: 600,
                        whiteSpace: "nowrap"
                      }}
                      onMouseEnter={(e) => {
                        if (!(p.stock !== undefined && p.stock !== null && p.stock <= 0)) {
                          e.target.style.backgroundColor = "#2a7ba0";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!(p.stock !== undefined && p.stock !== null && p.stock <= 0)) {
                          e.target.style.backgroundColor = "#3399cc";
                        }
                      }}
                    >
                      {(p.stock !== undefined && p.stock !== null && p.stock <= 0) ? "Out of Stock" : "Add to Cart"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Separator between Recommendations and General Products */}
      {!loading && !error && recommendedProducts.length > 0 && products.length > 0 && (
        <div style={{ 
          marginBottom: '30px', 
          padding: '20px 0',
          borderTop: '2px solid #e5e7eb',
          borderBottom: '2px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#374151', textAlign: 'center' }}>
              All Wholesale Products
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
              Browse all available wholesale products below
            </p>
            {!showRecommendations && (
              <button
                onClick={() => setShowRecommendations(true)}
                style={{
                  marginTop: '8px',
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
              >
                Show Recommendations
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && !error && products.length === 0 && recommendedProducts.length === 0 && (
        <p>No wholesale products available.</p>
      )}

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
        gap: "20px"
      }}>
        {products.map((p) => {
          const firstImage = (p.images && p.images.length > 0) ? p.images[0] : p.imageUrl;
          
          return (
            <div 
              key={p.id} 
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: "12px",
                padding: "16px",
                backgroundColor: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                position: "relative",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
              }}
            >
              {/* Clickable wrapper for entire card except input/button */}
              <Link 
                to={`/product/${p.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: "80px", // Leave space for quantity input and button
                  zIndex: 1
                }}
              />
              
              {/* Product Image */}
              {firstImage && (
                <img
                  src={`http://localhost:4000${firstImage}`}
                  alt={p.title}
                  style={{
                    width: "100%",
                    height: "200px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    position: "relative",
                    zIndex: 0
                  }}
                />
              )}

              {/* Product Title */}
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", position: "relative", zIndex: 0 }}>
                {p.title}
              </h3>

              {/* Description */}
              {p.description && (
                <p style={{ 
                  margin: 0, 
                  color: "#666", 
                  fontSize: "14px",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  lineHeight: "1.5",
                  position: "relative",
                  zIndex: 0
                }}>
                  {p.description}
                </p>
              )}

              {/* Price, Stock, and Additional Info */}
              <div style={{ marginTop: "auto", position: "relative", zIndex: 0 }}>
                {(() => {
                  const multiples = p.multiples || 1;
                  const pricePerUnit = parseFloat(p.price) || 0;
                  const totalPrice = pricePerUnit * multiples;
                  return (
                    <div>
                      <p style={{ margin: "4px 0", fontSize: "20px", fontWeight: "bold", color: "#3399cc" }}>
                        ₹{totalPrice.toFixed(2)}
                      </p>
                      {multiples > 1 && (
                        <p style={{ margin: "2px 0", fontSize: "12px", color: "#6b7280" }}>
                          ₹{pricePerUnit.toFixed(2)} per unit (×{multiples})
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Stock indicator */}
                {p.stock !== undefined && p.stock !== null && (() => {
                  const multiples = p.multiples || 1;
                  const totalUnits = p.stock * multiples;
                  return (
                    <>
                      <p style={{ margin: "4px 0", fontSize: "14px", color: "#666" }}>
                        <strong>Stock:</strong> {totalUnits} units
                        {multiples > 1 && (
                          <span style={{ marginLeft: "4px", fontSize: "12px", color: "#999" }}>
                            ({p.stock} multiple{p.stock !== 1 ? 's' : ''})
                          </span>
                        )}
                        {p.stock <= 0 && (
                          <span style={{
                            marginLeft: "8px",
                            fontSize: "12px",
                            color: "#dc2626",
                            fontWeight: "600",
                            backgroundColor: "#fee2e2",
                            padding: "2px 8px",
                            borderRadius: "4px"
                          }}>
                            OUT OF STOCK
                          </span>
                        )}
                      </p>
                      {/* Availability Date (shown when out of stock) */}
                      {p.stock <= 0 && p.availabilityDate && (
                        <p style={{ 
                          margin: "4px 0", 
                          fontSize: "13px", 
                          color: "#059669",
                          fontWeight: "500",
                          backgroundColor: "#d1fae5",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          display: "inline-block"
                        }}>
                          📅 Back in stock: {new Date(p.availabilityDate).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      )}
                    </>
                  );
                })()}

                {p.distanceKm !== null && (
                  <p style={{ margin: "4px 0", fontSize: "12px", color: "#999" }}>
                    <strong>Distance:</strong> {p.distanceKm} km
                  </p>
                )}

                {p.soldCount !== undefined && (
                  <p style={{ margin: "4px 0", fontSize: "12px", color: "#999" }}>
                    <strong>Sold:</strong> {p.soldCount}
                  </p>
                )}

                {p.owner && (
                  <p style={{ margin: "4px 0", fontSize: "12px", color: "#999" }}>
                    <strong>From:</strong> {p.owner.name}
                  </p>
                )}

                {/* Multiples indicator */}
                {p.multiples && p.multiples > 1 && (
                  <p style={{ margin: "4px 0", fontSize: "12px", color: "#f59e0b", fontWeight: "600" }}>
                    ⚠️ Order in multiples of {p.multiples} (e.g., {p.multiples}, {p.multiples * 2}, {p.multiples * 3}, ...)
                  </p>
                )}
              </div>

              {/* Quantity and Add to Cart */}
              <div 
                style={{ 
                  marginTop: "8px", 
                  display: "flex", 
                  gap: "10px", 
                  alignItems: "center", 
                  flexDirection: "column",
                  position: "relative",
                  zIndex: 2
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", gap: "10px", alignItems: "center", width: "100%" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                    <input
                      type="number"
                      min="1"
                      max={p.stock || undefined}
                      placeholder={p.multiples && p.multiples > 1 ? "No. of multiples" : "Qty"}
                      step="1"
                    disabled={p.stock !== undefined && p.stock !== null && p.stock <= 0}
                    style={{ 
                      width: "80px",
                      padding: "8px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontSize: "14px",
                      opacity: (p.stock !== undefined && p.stock !== null && p.stock <= 0) ? 0.6 : 1,
                      cursor: (p.stock !== undefined && p.stock !== null && p.stock <= 0) ? "not-allowed" : "text"
                    }}
                    value={quantity[p.id] || ""}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      if (p.stock !== undefined && p.stock !== null && p.stock <= 0) {
                        return;
                      }
                      const val = e.target.value;
                      if (!val) {
                        setQuantity({ ...quantity, [p.id]: "" });
                        return;
                      }
                      const numVal = parseInt(val);
                      const maxMultiples = p.stock || 0; // Stock is in multiples
                      
                      // Validate that user doesn't exceed available stock (in multiples)
                      if (numVal > maxMultiples) {
                        const multiples = p.multiples || 1;
                        const totalUnits = maxMultiples * multiples;
                        showModal(`Only ${maxMultiples} multiple${maxMultiples !== 1 ? 's' : ''} (${totalUnits} units) available in stock.`, "Stock Limit", "warning");
                        return;
                      }
                      
                      // Allow any positive integer - user is entering number of multiples
                      setQuantity({ ...quantity, [p.id]: val });
                    }}
                  />
                  {p.multiples && p.multiples > 1 && quantity[p.id] && (
                    <p style={{ margin: 0, fontSize: "11px", color: "#6b7280" }}>
                      = {parseInt(quantity[p.id]) * p.multiples} units
                    </p>
                  )}
                  </div>
                  <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        addToRetailerList(p.id);
                      }}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#22c55e",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                        transition: "background 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = "#16a34a"}
                      onMouseLeave={(e) => e.target.style.backgroundColor = "#22c55e"}
                      title="Add to My Products List"
                    >
                      +
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        addToWholesaleCart(p.id);
                      }}
                      disabled={p.stock !== undefined && p.stock !== null && p.stock <= 0}
                      style={{
                        flex: 1,
                        padding: "8px 16px",
                        backgroundColor: (p.stock !== undefined && p.stock !== null && p.stock <= 0) ? "#9ca3af" : "#3399cc",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: (p.stock !== undefined && p.stock !== null && p.stock <= 0) ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        transition: "background 0.2s",
                        opacity: (p.stock !== undefined && p.stock !== null && p.stock <= 0) ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!(p.stock !== undefined && p.stock !== null && p.stock <= 0)) {
                          e.target.style.backgroundColor = "#2a7ba0";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!(p.stock !== undefined && p.stock !== null && p.stock <= 0)) {
                          e.target.style.backgroundColor = "#3399cc";
                        }
                      }}
                    >
                      {(p.stock !== undefined && p.stock !== null && p.stock <= 0) ? "Out of Stock" : "Add to Cart"}
                    </button>
                  </div>
                </div>
                {p.multiples && p.multiples > 1 && (
                  <p style={{ margin: "4px 0", fontSize: "11px", color: "#6b7280", width: "100%" }}>
                    Enter number of multiples (each multiple = {p.multiples} units)
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
