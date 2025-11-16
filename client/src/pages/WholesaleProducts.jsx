// client/src/pages/WholesaleProducts.jsx
import React, { useEffect, useState } from "react";
import { api, authHeader } from "../api";

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

  const buy = async (productId) => {
    const qty = quantity[productId] || 1;

    try {
      await api.post(
        `/products/${productId}/buy-from-wholesaler`,
        { quantity: qty },
        { headers: authHeader() }
      );

      alert("Purchased wholesale successfully!");
      load();
    } catch (err) {
      alert("Unable to buy: " + err.response?.data?.error);
    }
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

          <div style={{ marginTop: 8 }}>
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
            <button style={{ marginLeft: 10 }} onClick={() => buy(p.id)}>
              Buy Wholesale
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
