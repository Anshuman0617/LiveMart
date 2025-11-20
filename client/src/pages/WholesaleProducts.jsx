// client/src/pages/WholesaleProducts.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { api, authHeader } from "../api";
import { Link } from "react-router-dom";
import debounce from "lodash.debounce";

export default function WholesaleProducts() {
  const [products, setProducts] = useState([]);
  const [quantity, setQuantity] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filters
  const [q, setQ] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxDistanceKm, setMaxDistanceKm] = useState("");
  const [sort, setSort] = useState("");

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

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

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
        if (maxDistanceKm) params.maxDistanceKm = maxDistanceKm;
        params.lat = newLatLng.lat;
        params.lng = newLatLng.lng;
        fetchProducts(params);
      }
    };

    window.addEventListener('userLogin', handleUserLogin);
    return () => {
      window.removeEventListener('userLogin', handleUserLogin);
    };
  }, [loadUserProfile, fetchProducts, q, minPrice, maxPrice, sort, maxDistanceKm]);

  // Initial fetch on mount
  useEffect(() => {
    if (!hasInitiallyFetchedRef.current) {
      hasInitiallyFetchedRef.current = true;
      fetchProducts({});
    }
  }, [fetchProducts]);

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
    if (maxDistanceKm) params.maxDistanceKm = maxDistanceKm;
    if (latLng) {
      params.lat = latLng.lat;
      params.lng = latLng.lng;
    }
    
    // Use debounced search for filter changes
    debouncedSearch(params);
  }, [q, minPrice, maxPrice, sort, maxDistanceKm, latLng, debouncedSearch]);

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
          alert("Location saved! This will be used for distance calculations.");
        } catch (err) {
          console.error("Failed to save location:", err);
          alert("Failed to save location. Please try again.");
        }
      },
      () => alert("Failed to access location")
    );
  };

  const addToWholesaleCart = (productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    // Check if product is out of stock
    if (product.stock !== undefined && product.stock !== null && product.stock <= 0) {
      alert("This product is out of stock!");
      return;
    }

    const numMultiples = parseInt(quantity[productId] || 1, 10); // Number of multiples user wants to order
    if (numMultiples < 1) {
      alert("Quantity must be at least 1");
      return;
    }

    const multiples = product.multiples || 1;
    const maxMultiples = product.stock || 0; // Stock is in multiples
    const totalUnitsAvailable = maxMultiples * multiples; // Total units available
    const totalUnitsOrdered = numMultiples * multiples; // Total units user wants to order
    
    // Validate that user doesn't exceed available stock (in multiples)
    if (numMultiples > maxMultiples) {
      alert(`Only ${maxMultiples} multiple${maxMultiples !== 1 ? 's' : ''} (${totalUnitsAvailable} units) available in stock.`);
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
          alert(`Cannot add ${numMultiples} multiple${numMultiples !== 1 ? 's' : ''} (${totalUnitsOrdered} units). The total quantity would be ${newTotalUnits} units, which is not a multiple of ${multiples}. The next valid quantity (${nextValidUnits} units = ${nextValidMultiples} multiples) exceeds available stock (${maxMultiples} multiples = ${totalUnitsAvailable} units).`);
          setQuantity({ ...quantity, [productId]: "" });
          return;
        }
        alert(`Adding ${numMultiples} multiple${numMultiples !== 1 ? 's' : ''} (${totalUnitsOrdered} units) would result in ${newTotalUnits} total units, which is not a multiple of ${multiples}. Adjusting to ${nextValidUnits} units (${nextValidMultiples} multiples).`);
        existing.quantity = nextValidUnits;
      } else if (newTotalMultiples > maxMultiples) {
        alert(`Only ${maxMultiples} multiple${maxMultiples !== 1 ? 's' : ''} (${totalUnitsAvailable} units) available in stock. You already have ${existingUnits} units (${existingUnits / multiples} multiples) in your cart.`);
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
    alert("Added to wholesale cart!");
    // Reset quantity input
    setQuantity({ ...quantity, [productId]: "" });
  };

  return (
    <div className="App">
      <h1>Wholesale Products</h1>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Browse wholesale products from wholesalers. Add items to your wholesale cart to purchase.
      </p>

      {/* Filters */}
      <div className="row" style={{ marginBottom: 20 }}>
        <input
          placeholder="Search..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 300 }}
        />

        <input
          placeholder="Min Price"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          type="number"
          style={{ maxWidth: 140 }}
        />

        <input
          placeholder="Max Price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          type="number"
          style={{ maxWidth: 140 }}
        />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{ maxWidth: 150 }}
        >
          <option value="">Sort</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="most_sold">Most Sold</option>
          <option value="distance">Closest</option>
        </select>
      </div>

      {/* Location */}
      <div className="row" style={{ marginBottom: 20, flexWrap: "wrap", gap: "8px" }}>
        <input
          placeholder="Max Distance (km)"
          value={maxDistanceKm}
          onChange={(e) => setMaxDistanceKm(e.target.value)}
          type="number"
          style={{ maxWidth: 150 }}
        />
        
        {latLng && latLng.lat != null && latLng.lng != null && (
          <p style={{ margin: 0, color: "#666", fontSize: "0.9em", alignSelf: "center" }}>
            📍 Location set: {Number(latLng.lat).toFixed(4)}, {Number(latLng.lng).toFixed(4)}
          </p>
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

      {!loading && !error && products.length === 0 && <p>No wholesale products available.</p>}

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
                gap: "12px"
              }}
            >
              {/* Product Image */}
              {firstImage && (
                <Link to={`/product/${p.id}`}>
                  <img
                    src={`http://localhost:4000${firstImage}`}
                    alt={p.title}
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
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>
                <Link to={`/product/${p.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                  {p.title}
                </Link>
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
                  lineHeight: "1.5"
                }}>
                  {p.description}
                </p>
              )}

              {/* Price, Stock, and Additional Info */}
              <div style={{ marginTop: "auto" }}>
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
              <div style={{ marginTop: "8px", display: "flex", gap: "10px", alignItems: "center", flexDirection: "column" }}>
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
                        alert(`Only ${maxMultiples} multiple${maxMultiples !== 1 ? 's' : ''} (${totalUnits} units) available in stock.`);
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
                  <button 
                    onClick={() => addToWholesaleCart(p.id)}
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
