// client/src/pages/WholesalerDashboard.jsx
import React, { useEffect, useState } from "react";
import { api, authHeader } from "../api";
import ProductForm from "../components/ProductForm";
import { useNavigate } from "react-router-dom";

export default function WholesalerDashboard() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const navigate = useNavigate();

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products", {
        params: { ownerType: "wholesaler" },
      });
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const mine = res.data.products.filter((p) => p.ownerId === user.id);
      setProducts(mine);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const createProduct = async (data) => {
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(data)) {
        if (k !== "images") fd.append(k, v);
      }
      for (const file of data.images) fd.append("images", file);

      await api.post("/products", fd, {
        headers: { ...authHeader(), "Content-Type": "multipart/form-data" },
      });

      fetchProducts();
      alert("Product created!");
    } catch (err) {
      alert("Failed to create product");
    }
  };

  const updateProduct = async (id, data) => {
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(data)) {
        if (k !== "images") fd.append(k, v);
      }
      for (const file of data.images) fd.append("images", file);

      await api.put(`/products/${id}`, fd, {
        headers: { ...authHeader(), "Content-Type": "multipart/form-data" },
      });

      setEditing(null);
      fetchProducts();
      alert("Product updated!");
    } catch (err) {
      alert("Update failed");
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm("Delete this product?")) return;
    await api.delete(`/products/${id}`, { headers: authHeader() });
    fetchProducts();
  };

  return (
    <div className="App">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Wholesaler Dashboard</h2>
        <button
          onClick={() => navigate('/orders')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3399cc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 600,
            transition: 'background 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2a7fa3'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#3399cc'}
        >
          📦 Manage Orders
        </button>
      </div>

      {!editing && (
        <ProductForm submitLabel="Add Product" onSubmit={createProduct} allowDiscount={false} />
      )}

      {editing && (
        <ProductForm
          submitLabel="Save Changes"
          onSubmit={(data) => updateProduct(editing.id, data)}
          initial={editing}
          allowDiscount={false}
          onProductUpdate={(updatedProduct) => {
            setEditing(updatedProduct);
            fetchProducts();
          }}
        />
      )}

      <h3>My Products</h3>

      {products.length === 0 && <p>No products yet. Create your first product above.</p>}

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
        gap: "20px",
        marginTop: "20px"
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
                  overflow: "hidden"
                }}>
                  {p.description}
                </p>
              )}

              {/* Price and Stock */}
              <div>
                <p style={{ margin: "4px 0", fontSize: "20px", fontWeight: "bold", color: "#3399cc" }}>
                  ₹{parseFloat(p.price).toFixed(2)}
                </p>
                <p style={{ margin: "4px 0", fontSize: "14px", color: "#666" }}>
                  <strong>Stock:</strong> {p.stock} units
                </p>
                <p style={{ margin: "4px 0", fontSize: "14px", color: "#666" }}>
                  <strong>Sold:</strong> {p.soldCount || 0} units
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                <button 
                  onClick={() => setEditing(p)}
                  style={{
                    flex: 1,
                    padding: "8px 16px",
                    backgroundColor: "#3399cc",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#2a7ba0"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#3399cc"}
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteProduct(p.id)}
                  style={{
                    flex: 1,
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
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
