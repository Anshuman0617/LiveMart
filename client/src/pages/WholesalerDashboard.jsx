// client/src/pages/WholesalerDashboard.jsx
import React, { useEffect, useState } from "react";
import { api, authHeader } from "../api";
import ProductForm from "../components/ProductForm";

export default function WholesalerDashboard() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);

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
      <h2>Wholesaler Dashboard</h2>

      {!editing && (
        <ProductForm submitLabel="Add Product" onSubmit={createProduct} allowDiscount={false} />
      )}

      {editing && (
        <ProductForm
          submitLabel="Save Changes"
          onSubmit={(data) => updateProduct(editing.id, data)}
          initial={editing}
          allowDiscount={false}
        />
      )}

      <h3>My Products</h3>

      {products.map((p) => (
        <div className="product-card" key={p.id}>
          <h3>{p.title}</h3>
          <p>₹{p.price}</p>

          <button onClick={() => setEditing(p)}>Edit</button>

          <button
            onClick={() => deleteProduct(p.id)}
            style={{ marginLeft: 10, background: "#dc2626" }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
