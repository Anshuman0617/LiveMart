// client/src/pages/Products.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { api, authHeader } from "../api";
import { Link, useNavigate } from "react-router-dom";
import debounce from "lodash.debounce";
import { personalizeProductList, generateRecommendations } from "../utils/recommendations.js";
import { getTopCategories } from "../utils/browsingHistory.js";
import { useModal } from "../hooks/useModal";

// Products page - accessible to all users (including unauthenticated)
export default function Products() {
  const { showModal, ModalComponent } = useModal();
  const [products, setProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const navigate = useNavigate();
  
  // Check if user is a retailer - they shouldn't see regular products
  // Note: Unauthenticated users can access this page
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.role === 'retailer') {
      navigate('/retailer', { replace: true });
      return;
    }
  }, [navigate]);

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
      const res = await api.get("/products", { params });
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
      
      // Personalize product list based on user history
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (user && orders.length > 0) {
        const personalized = personalizeProductList(sortedProducts, orders, 'retailer');
        setProducts(personalized);
        
        // Generate recommendations (top 4 only)
        const recommendations = generateRecommendations(sortedProducts, orders, 'retailer', 4);
        setRecommendedProducts(recommendations);
      } else {
        setProducts(sortedProducts);
        setRecommendedProducts([]);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError(err.response?.data?.error || 'Failed to load products. Please try again.');
      setProducts([]);
      setRecommendedProducts([]);
    } finally {
      setLoading(false);
    }
  }, [orders]);

  const debouncedSearch = useCallback(
    debounce((params) => fetchProducts(params), 300),
    [fetchProducts]
  );

  // Load user's saved location on mount and when user updates (optional - works without login)
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
      // User not logged in or error - that's okay, page works without authentication
      console.log("Could not load user profile (user may not be logged in):", err);
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
    // Don't fetch if user is a retailer (they'll be redirected)
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.role === 'retailer') {
      return;
    }

    // Fetch products immediately on mount (only once)
    if (!hasInitiallyFetchedRef.current) {
      hasInitiallyFetchedRef.current = true;
      const initialParams = {};
      // If user has location, include it with default 45km distance
      if (latLng) {
        initialParams.lat = latLng.lat;
        initialParams.lng = latLng.lng;
        initialParams.maxDistanceKm = 45;
      }
      fetchProducts(initialParams);
    }
  }, [fetchProducts]); // Only run when fetchProducts changes (which is stable)

  // Fetch products when filters or location change (debounced)
  useEffect(() => {
    // Don't fetch if user is a retailer (they'll be redirected)
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.role === 'retailer') {
      return;
    }

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
    if (latLng) {
      params.lat = latLng.lat;
      params.lng = latLng.lng;
      // Always include maxDistanceKm when location is set (default 45km)
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


  return (
    <div className="App">
      <ModalComponent />
      <h1>Products</h1>

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
            <option value="rating_desc">Highest Rated</option>
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
          <p>Loading products...</p>
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
              const rating = p.ratingAvg || 0;
              const reviewsCount = p.reviewsCount || 0;
              const fullStars = Math.floor(rating);
              const hasHalfStar = rating % 1 >= 0.5;
              
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
                    position: "relative"
                  }}
                >
                  {/* Clickable wrapper for entire card except button */}
                  <Link 
                    to={`/product/${p.id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: "60px", // Leave space for the button
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
                    {p.discount > 0 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "20px", fontWeight: "bold", color: "#dc2626" }}>
                          ₹{parseFloat(p.price * (1 - p.discount / 100)).toFixed(2)}
                        </span>
                        <span style={{ 
                          color: "#666", 
                          textDecoration: "line-through",
                          fontSize: "14px"
                        }}>
                          ₹{parseFloat(p.price).toFixed(2)}
                        </span>
                        <span style={{ 
                          backgroundColor: "#dc2626",
                          color: "white",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 600
                        }}>
                          {parseFloat(p.discount).toFixed(0)}% OFF
                        </span>
                      </div>
                    ) : (
                      <p style={{ margin: "4px 0", fontSize: "20px", fontWeight: "bold", color: "#3399cc" }}>
                        ₹{parseFloat(p.price).toFixed(2)}
                      </p>
                    )}
                  </div>
                  {rating > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", position: "relative", zIndex: 0 }}>
                      {[...Array(5)].map((_, i) => (
                        <span key={i} style={{ color: i < fullStars ? "#fbbf24" : "#d1d5db" }}>
                          ★
                        </span>
                      ))}
                      <span style={{ fontSize: "12px", color: "#666", marginLeft: "4px" }}>
                        ({reviewsCount})
                      </span>
                    </div>
                  )}
                  {/* Stock indicator */}
                  {p.stock !== undefined && p.stock !== null && (
                    <p style={{ margin: "4px 0", fontSize: "14px", color: "#666", position: "relative", zIndex: 0 }}>
                      <strong>Stock:</strong> {p.stock} units
                    </p>
                  )}
                  {/* Availability date for out-of-stock items */}
                  {p.stock <= 0 && p.availabilityDate && (
                    <p style={{ margin: "4px 0", fontSize: "13px", color: "#2563eb", fontWeight: 600, position: "relative", zIndex: 0 }}>
                      📅 Back in stock: {new Date(p.availabilityDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                  {/* Add to Cart Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const user = JSON.parse(localStorage.getItem('user') || 'null');
                      const userId = user?.id;
                      const cartKey = userId ? `cart_${userId}` : 'cart';
                      const cart = JSON.parse(localStorage.getItem(cartKey) || "[]");
                      const existing = cart.find((c) => c.productId === p.id);

                      if (existing) {
                        existing.quantity += 1;
                      } else {
                        cart.push({
                          productId: p.id,
                          title: p.title,
                          price: p.price,
                          quantity: 1,
                        });
                      }

                      localStorage.setItem(cartKey, JSON.stringify(cart));
                      showModal("Added to cart!", "Success", "success");
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
                      position: "relative",
                      zIndex: 2,
                      marginTop: "auto"
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
              All Products
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
              Browse all available products below
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

      {/* PRODUCT GRID */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
        gap: "20px"
      }}>
        {!loading && !error && products.length === 0 && <p>No products found.</p>}

        {products.map((p) => {
          // Get first image (use images array if available, otherwise imageUrl)
          const firstImage = (p.images && p.images.length > 0) ? p.images[0] : p.imageUrl;
          
          // Calculate star rating
          const rating = p.ratingAvg || 0;
          const reviewsCount = p.reviewsCount || 0;
          const fullStars = Math.floor(rating);
          const hasHalfStar = rating % 1 >= 0.5;
          
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
                position: "relative"
              }}
            >
              {/* Clickable wrapper for entire card except button */}
              <Link 
                to={`/product/${p.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: "60px", // Leave space for the button
                  zIndex: 1,
                  cursor: "pointer"
                }}
                onClick={(e) => {
                  // Don't navigate if clicking on the button area
                  const target = e.target;
                  if (target.closest('button')) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
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
                    pointerEvents: "none"
                  }}
                />
              )}

              {/* Product Title */}
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", pointerEvents: "none" }}>
                {p.title}
              </h3>

              {/* Star Rating */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", pointerEvents: "none" }}>
                <div style={{ display: "flex", gap: "2px" }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    if (rating === 0) {
                      return <span key={star} style={{ fontSize: "16px", color: "#d1d5db" }}>☆</span>;
                    }
                    if (star <= fullStars) {
                      return <span key={star} style={{ fontSize: "16px", color: "#fbbf24" }}>★</span>;
                    }
                    if (hasHalfStar && star === fullStars + 1) {
                      // Show half star (we'll use a full star for simplicity, or could use a special character)
                      return <span key={star} style={{ fontSize: "16px", color: "#fbbf24", opacity: 0.6 }}>★</span>;
                    }
                    return <span key={star} style={{ fontSize: "16px", color: "#d1d5db" }}>☆</span>;
                  })}
                </div>
                {rating > 0 ? (
                  <span style={{ fontSize: "14px", color: "#666", marginLeft: "4px" }}>
                    {rating.toFixed(1)} ({reviewsCount} {reviewsCount === 1 ? 'review' : 'reviews'})
                  </span>
                ) : (
                  <span style={{ fontSize: "14px", color: "#999" }}>No ratings yet</span>
                )}
              </div>

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
                  pointerEvents: "none"
                }}>
                  {p.description}
                </p>
              )}

              {/* Price with discount indicator */}
              <div style={{ marginTop: "auto", pointerEvents: "none" }}>
                {p.discount && p.discount > 0 ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                      <span style={{ 
                        fontSize: "20px", 
                        fontWeight: "bold", 
                        color: "#22c55e" 
                      }}>
                        ₹{(p.price*(1-p.discount/100)).toFixed(2)}
                      </span>
                      <span style={{ 
                        fontSize: "14px", 
                        color: "#999", 
                        textDecoration: "line-through" 
                      }}>
                        ₹{parseFloat(p.price).toFixed(2)}
                      </span>
                      <span style={{ 
                        fontSize: "12px", 
                        color: "#dc2626", 
                        fontWeight: "600",
                        backgroundColor: "#fee2e2",
                        padding: "2px 6px",
                        borderRadius: "4px"
                      }}>
                        {p.discount}% OFF
                      </span>
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: "4px 0", fontSize: "20px", fontWeight: "bold", color: "#3399cc" }}>
                    ₹{parseFloat(p.price).toFixed(2)}
                  </p>
                )}

                {/* Stock indicator */}
                {p.stock !== undefined && p.stock !== null && (
                  <p style={{ margin: "4px 0", fontSize: "14px", color: "#666" }}>
                    <strong>Stock:</strong> {p.stock} units
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
                )}

                {/* Availability Date (shown when out of stock) */}
                {p.stock !== undefined && p.stock !== null && p.stock <= 0 && p.availabilityDate && (
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

                {p.distanceKm !== null && (
                  <p style={{ margin: "4px 0", fontSize: "12px", color: "#999" }}>
                    <strong>Distance:</strong> {p.distanceKm} km
                  </p>
                )}

                {/* Retailer details for consumers (hide sold count) */}
                {(() => {
                  const user = JSON.parse(localStorage.getItem('user') || 'null');
                  const isConsumer = !user || user.role === 'customer';
                  
                  if (isConsumer && p.owner) {
                    return (
                      <div style={{ margin: "4px 0" }}>
                        <p style={{ margin: "2px 0", fontSize: "12px", color: "#666" }}>
                          <strong>Retailer:</strong> {p.owner.name || 'N/A'}
                        </p>
                        {p.owner.address && (
                          <p style={{ margin: "2px 0", fontSize: "11px", color: "#999" }}>
                            {p.owner.address.length > 40 ? `${p.owner.address.substring(0, 40)}...` : p.owner.address}
                          </p>
                        )}
                      </div>
                    );
                  } else if (!isConsumer && p.soldCount !== undefined) {
                    // Show sold count for retailers/wholesalers
                    return (
                      <p style={{ margin: "4px 0", fontSize: "12px", color: "#999" }}>
                        <strong>Sold:</strong> {p.soldCount}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Add to Cart Button */}
              <button
                style={{ 
                  position: "relative", 
                  zIndex: 2,
                  marginTop: "8px",
                  padding: "8px 16px",
                  backgroundColor: (p.stock !== undefined && p.stock !== null && p.stock <= 0) ? "#9ca3af" : "#3399cc",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: (p.stock !== undefined && p.stock !== null && p.stock <= 0) ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "background 0.2s",
                  width: "100%",
                  opacity: (p.stock !== undefined && p.stock !== null && p.stock <= 0) ? 0.6 : 1
                }}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click
                  // Check if product is out of stock
                  if (p.stock !== undefined && p.stock !== null && p.stock <= 0) {
                    showModal("This product is out of stock!", "Out of Stock", "warning");
                    return;
                  }

                  const user = JSON.parse(localStorage.getItem('user') || 'null');
                  const userId = user?.id;
                  const cartKey = userId ? `cart_${userId}` : 'cart';
                  const cart = JSON.parse(localStorage.getItem(cartKey) || "[]");
                  const existing = cart.find((c) => c.productId === p.id);

                  const maxQuantity = Math.min(10, p.stock || 10);
                  
                  if (existing) {
                    if (existing.quantity >= maxQuantity) {
                      showModal(`Maximum ${maxQuantity} items allowed for this product.`, "Quantity Limit", "warning");
                      return;
                    }
                    existing.quantity++;
                  } else {
                    cart.push({
                      productId: p.id,
                      title: p.title,
                      price: p.price,
                      quantity: 1,
                    });
                  }

                  localStorage.setItem(cartKey, JSON.stringify(cart));
                  showModal("Added to cart!", "Success", "success");
                }}
                disabled={p.stock !== undefined && p.stock !== null && p.stock <= 0}
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
          );
        })}
      </div>
    </div>
  );
}
