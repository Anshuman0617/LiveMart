// client/src/pages/RetailerDashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { api, authHeader } from "../api";
import ProductForm from "../components/ProductForm";
import { Link, useNavigate } from "react-router-dom";
import debounce from "lodash.debounce";

export default function RetailerDashboard() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products", {
        params: { ownerType: "retailer" },
      });
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const mine = res.data.products.filter((p) => p.ownerId === user.id);
      setProducts(mine);
      setFilteredProducts(mine);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Fuzzy search function
  const fuzzySearch = useCallback(
    debounce((query, productList) => {
      if (!query.trim()) {
        setFilteredProducts(productList);
        return;
      }

      const lowerQuery = query.toLowerCase();
      const filtered = productList.filter((product) => {
        const title = (product.title || "").toLowerCase();
        const description = (product.description || "").toLowerCase();
        
        // Check if query matches title or description
        return title.includes(lowerQuery) || description.includes(lowerQuery);
      });
      
      setFilteredProducts(filtered);
    }, 300),
    []
  );

  useEffect(() => {
    fuzzySearch(searchQuery, products);
  }, [searchQuery, products, fuzzySearch]);

  const createProduct = async (data) => {
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(data)) {
        if (k !== "images") fd.append(k, v);
      }
      // append uploaded images
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
        <h2 style={{ margin: 0 }}>Retailer Dashboard</h2>
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
        <ProductForm submitLabel="Add Product" onSubmit={createProduct} allowDiscount />
      )}

      {editing && (
        <ProductForm
          submitLabel="Save Changes"
          onSubmit={(data) => updateProduct(editing.id, data)}
          initial={editing}
          allowDiscount
          onProductUpdate={(updatedProduct) => {
            setEditing(updatedProduct);
            fetchProducts();
          }}
        />
      )}

      <h3>My Products</h3>

      {/* Search Bar */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search your products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "10px",
            fontSize: "16px",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        />
      </div>

      {/* Products Grid - Using same card style as Products page */}
      <div className="cards">
        {filteredProducts.length === 0 && (
          <p>{searchQuery ? "No products found matching your search." : "No products yet. Add your first product!"}</p>
        )}

        {filteredProducts.map((p) => (
          <div className="product-card" key={p.id}>
            {p.imageUrl && (
              <img
                src={`http://localhost:4000${p.imageUrl}`}
                alt={p.title}
                style={{
                  width: "100%",
                  height: "200px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  marginBottom: "10px",
                }}
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

            <p><strong>Stock:</strong> {p.stock || 0}</p>
            <p><strong>Sold:</strong> {p.soldCount || 0}</p>

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button
                onClick={() => setEditing(p)}
                style={{
                  flex: 1,
                  padding: "8px 16px",
                  background: "#3399cc",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
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
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
