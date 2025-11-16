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

    const qty = parseInt(quantity[productId] || 1, 10);
    if (qty < 1) {
      alert("Quantity must be at least 1");
      return;
    }

    // Get user-specific wholesale cart
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userId = user?.id;
    const cartKey = userId ? `wholesaleCart_${userId}` : 'wholesaleCart';
    const cart = JSON.parse(localStorage.getItem(cartKey) || "[]");
    const existing = cart.find((c) => c.productId === productId);

    if (existing) {
      existing.quantity += qty;
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

      {products.map((p) => (
        <div key={p.id} className="product-card">
          <h3>{p.title}</h3>
          <p><strong>Price:</strong> ₹{p.price}</p>
          <p><strong>Stock:</strong> {p.stock}</p>

          {p.imageUrl && (
            <img
              src={`http://localhost:4000${p.imageUrl}`}
              style={{ width: 130, height: 90, borderRadius: 10 }}
            />
          )}

          <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
            <input
              type="number"
              min="1"
              placeholder="Quantity"
              style={{ width: 100 }}
              value={quantity[p.id] || ""}
              onChange={(e) =>
                setQuantity({ ...quantity, [p.id]: e.target.value })
              }
            />
            <button onClick={() => addToWholesaleCart(p.id)}>
              Add to Cart
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
