// client/src/pages/WholesaleProducts.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function WholesaleProducts() {
  const [products, setProducts] = useState([]);
  const [quantity, setQuantity] = useState({});

  const load = async () => {
    const res = await api.get("/products", {
      params: { ownerType: "wholesaler" }
    });
    setProducts(res.data.products);
  };

  useEffect(() => {
    load();
  }, []);

  const addToWholesaleCart = (productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    // Check if product is out of stock
    if (product.stock !== undefined && product.stock !== null && product.stock <= 0) {
      alert("This product is out of stock!");
      return;
    }

    const qty = parseInt(quantity[productId] || 1, 10);
    if (qty < 1) {
      alert("Quantity must be at least 1");
      return;
    }

    const maxQuantity = Math.min(10, product.stock || 10);
    if (qty > maxQuantity) {
      alert(`Maximum ${maxQuantity} items allowed for this product.`);
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
      const newTotal = existing.quantity + qty;
      if (newTotal > maxQuantity) {
        alert(`Maximum ${maxQuantity} items allowed for this product. You already have ${existing.quantity} in your cart.`);
        setQuantity({ ...quantity, [productId]: "" });
        return;
      }
      existing.quantity = newTotal;
    } else {
      cart.push({
        productId: product.id,
        title: product.title,
        price: product.price,
        quantity: qty,
      });
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));
    alert("Added to wholesale cart!");
    // Reset quantity input
    setQuantity({ ...quantity, [productId]: "" });
  };

  return (
    <div className="App">
      <h2>Wholesale Products</h2>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Browse wholesale products from wholesalers. Add items to your wholesale cart to purchase.
      </p>

      {products.length === 0 && <p>No wholesale products available.</p>}

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
                <img
                  src={`http://localhost:4000${firstImage}`}
                  alt={p.title}
                  style={{
                    width: "100%",
                    height: "200px",
                    objectFit: "cover",
                    borderRadius: "8px"
                  }}
                />
              )}

              {/* Product Title */}
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>
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
                  lineHeight: "1.5"
                }}>
                  {p.description}
                </p>
              )}

              {/* Price and Stock */}
              <div style={{ marginTop: "auto" }}>
                <p style={{ margin: "4px 0", fontSize: "20px", fontWeight: "bold", color: "#3399cc" }}>
                  ₹{parseFloat(p.price).toFixed(2)}
                </p>
                <p style={{ margin: "4px 0", fontSize: "14px", color: "#666" }}>
                  <strong>Stock:</strong> {p.stock} units
                  {p.stock !== undefined && p.stock !== null && p.stock <= 0 && (
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
                {p.owner && (
                  <p style={{ margin: "4px 0", fontSize: "12px", color: "#999" }}>
                    From: {p.owner.name}
                  </p>
                )}
              </div>

              {/* Quantity and Add to Cart */}
              <div style={{ marginTop: "8px", display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="number"
                  min="1"
                  max={Math.min(10, p.stock || 10)}
                  placeholder="Qty"
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
                    const maxQty = Math.min(10, p.stock || 10);
                    if (val && parseInt(val) > maxQty) {
                      alert(`Maximum ${maxQty} items allowed for this product.`);
                      return;
                    }
                    setQuantity({ ...quantity, [p.id]: val });
                  }}
                />
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
