// client/src/pages/Products.jsx
import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import AddressAutocomplete from "../components/AddressAutocomplete";
import { Link } from "react-router-dom";
import debounce from "lodash.debounce";

export default function Products() {
  const [products, setProducts] = useState([]);

  // filters
  const [q, setQ] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxDistanceKm, setMaxDistanceKm] = useState("");
  const [sort, setSort] = useState("");

  const [latLng, setLatLng] = useState(null);
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProducts = async (params = {}) => {
    try {
      const res = await api.get("/products", { params });
      setProducts(res.data.products || []);
    } catch (err) {
      console.error(err);
    }
  };

  const debouncedSearch = useCallback(
    debounce((params) => fetchProducts(params), 300),
    []
  );

  // Load user's saved address on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const res = await api.get("/users/me");
        const user = res.data;
        if (user.address) {
          setAddress(user.address);
        }
        if (user.lat && user.lng) {
          setLatLng({ lat: user.lat, lng: user.lng });
        }
      } catch (err) {
        // User not logged in or error - that's okay
        console.log("Could not load user profile:", err);
      }
    };
    loadUserProfile();
  }, []);

  useEffect(() => {
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
    debouncedSearch(params);
  }, [q, minPrice, maxPrice, sort, maxDistanceKm, latLng, debouncedSearch]);

  const useMyLocation = async () => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLatLng(newLatLng);
        
        // Save to user profile if logged in
        try {
          await api.put("/users/me", {
            lat: newLatLng.lat,
            lng: newLatLng.lng,
          });
          alert("Location saved!");
        } catch (err) {
          console.error("Failed to save location:", err);
        }
      },
      () => alert("Failed to access location")
    );
  };

  const handlePlaceSelected = async (selectedAddress, place) => {
    if (place?.geometry?.location) {
      const newLatLng = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };
      setLatLng(newLatLng);
      setAddress(selectedAddress);
      
      // Save address and coordinates to user profile
      setSaving(true);
      try {
        await api.put("/users/me", {
          address: selectedAddress,
          lat: newLatLng.lat,
          lng: newLatLng.lng,
        });
        alert("Address saved successfully!");
      } catch (err) {
        console.error("Failed to save address:", err);
        alert("Failed to save address. Please try again.");
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSaveAddress = async () => {
    if (!address.trim()) {
      alert("Please enter an address first");
      return;
    }

    setSaving(true);
    try {
      const payload = { address: address };
      // If we have lat/lng from autocomplete, send it; otherwise server will geocode
      if (latLng) {
        payload.lat = latLng.lat;
        payload.lng = latLng.lng;
      }
      
      const res = await api.put("/users/me", payload);
      const updatedUser = res.data;
      
      // Update local state with the geocoded coordinates if we didn't have them
      if (!latLng && updatedUser.lat && updatedUser.lng) {
        setLatLng({ lat: updatedUser.lat, lng: updatedUser.lng });
      }
      
      alert("Address saved successfully!");
    } catch (err) {
      console.error("Failed to save address:", err);
      alert("Failed to save address. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="App">
      <h1>Products</h1>

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
        <AddressAutocomplete
          placeholder="Enter location..."
          value={address}
          onChange={setAddress}
          onPlaceSelected={handlePlaceSelected}
        />
        <button 
          onClick={handleSaveAddress} 
          disabled={saving || !address.trim()}
          style={{ minWidth: 100 }}
        >
          {saving ? "Saving..." : "Save Address"}
        </button>
        <button onClick={useMyLocation}>Use My Location</button>

        <input
          placeholder="Max Distance (km)"
          value={maxDistanceKm}
          onChange={(e) => setMaxDistanceKm(e.target.value)}
          type="number"
          style={{ maxWidth: 150 }}
        />
      </div>
      
      {address && (
        <p style={{ marginBottom: 10, color: "#666", fontSize: "0.9em" }}>
          📍 Your location: {address}
        </p>
      )}

      {/* PRODUCT GRID */}
      <div className="cards">
        {products.length === 0 && <p>No products found.</p>}

        {products.map((p) => (
          <div className="product-card" key={p.id}>
            {p.imageUrl && (
              <img
                src={`http://localhost:4000${p.imageUrl}`}
                alt={p.title}
              />
            )}

            <h3>
              <Link to={`/product/${p.id}`}>{p.title}</Link>
            </h3>

            <p>{p.description}</p>
            <p><strong>Price:</strong> ₹{p.price}</p>

            {p.discount ? (
              <p><strong>Discount:</strong> {p.discount}%</p>
            ) : null}

            {p.distanceKm !== null && (
              <p><strong>Distance:</strong> {p.distanceKm} km</p>
            )}

            <p><strong>Sold:</strong> {p.soldCount}</p>

            <button
              onClick={() => {
                const cart = JSON.parse(localStorage.getItem("cart") || "[]");
                const existing = cart.find((c) => c.productId === p.id);

                if (existing) existing.quantity++;
                else
                  cart.push({
                    productId: p.id,
                    title: p.title,
                    price: p.price,
                    quantity: 1,
                  });

                localStorage.setItem("cart", JSON.stringify(cart));
                alert("Added to cart!");
              }}
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
