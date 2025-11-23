// client/src/pages/RetailerDashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { api, authHeader } from "../api";
import ProductForm from "../components/ProductForm";
import { Link } from "react-router-dom";
import debounce from "lodash.debounce";
import { useModal } from "../hooks/useModal";

export default function RetailerDashboard() {
  const { showModal, ModalComponent } = useModal();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDiscountedOnly, setShowDiscountedOnly] = useState(false);
  const [showOutOfStockOnly, setShowOutOfStockOnly] = useState(false);
  const [category, setCategory] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, productId: null });

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

  // Filter and search function
  const filterAndSearch = useCallback(
    debounce((query, productList, discountedOnly, outOfStockOnly, categoryFilter) => {
      let filtered = productList;

      // Apply category filter first
      if (categoryFilter && categoryFilter !== 'all') {
        filtered = filtered.filter((product) => {
          return product.category === categoryFilter;
        });
      }

      // Apply discount filter
      if (discountedOnly) {
        filtered = filtered.filter((product) => {
          const discount = parseFloat(product.discount || 0);
          return discount > 0;
        });
      }

      // Apply out of stock filter
      if (outOfStockOnly) {
        filtered = filtered.filter((product) => {
          const stock = parseInt(product.stock || 0);
          return stock <= 0;
        });
      }

      // Apply search query
      if (query.trim()) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter((product) => {
          const title = (product.title || "").toLowerCase();
          const description = (product.description || "").toLowerCase();
          
          // Check if query matches title or description
          return title.includes(lowerQuery) || description.includes(lowerQuery);
        });
      }
      
      setFilteredProducts(filtered);
    }, 300),
    []
  );

  useEffect(() => {
    filterAndSearch(searchQuery, products, showDiscountedOnly, showOutOfStockOnly, category);
  }, [searchQuery, products, showDiscountedOnly, showOutOfStockOnly, category, filterAndSearch]);

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
      showModal("Product created!", "Success", "success");
    } catch (err) {
      showModal("Failed to create product", "Error", "error");
    }
  };

  const updateProduct = async (id, data) => {
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(data)) {
        if (k !== "images") {
          // Convert values to strings for FormData
          if (v !== null && v !== undefined) {
            fd.append(k, String(v));
          }
        }
      }
      // Only append images if they exist and are files
      if (data.images && Array.isArray(data.images)) {
        for (const file of data.images) {
          if (file instanceof File) {
            fd.append("images", file);
          }
        }
      }

      await api.put(`/products/${id}`, fd, {
        headers: { ...authHeader(), "Content-Type": "multipart/form-data" },
      });

      setEditing(null);
      fetchProducts();
      showModal("Product updated!", "Success", "success");
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || "Update failed";
      showModal(errorMessage, "Error", "error");
      console.error("Update product error:", err);
    }
  };

  const deleteProduct = (id) => {
    setDeleteConfirm({ show: true, productId: id });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.productId) {
      try {
        await api.delete(`/products/${deleteConfirm.productId}`, { headers: authHeader() });
        fetchProducts();
        showModal("Product deleted successfully!", "Success", "success");
      } catch (err) {
        showModal("Failed to delete product", "Error", "error");
      }
    }
    setDeleteConfirm({ show: false, productId: null });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, productId: null });
  };

  return (
    <div className="App">
      <ModalComponent />
      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            padding: '20px'
          }}
          onClick={cancelDelete}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
              border: '2px solid #ef4444'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600, color: '#991b1b' }}>
              Delete Product?
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#374151' }}>
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={cancelDelete}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "24px",
        paddingBottom: "16px",
        borderBottom: "2px solid #e0e0e0"
      }}>
        <h2 style={{ margin: 0, fontSize: "28px", fontWeight: "600", color: "#333" }}>
          Retailer Dashboard
        </h2>
        {!editing && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: "10px 20px",
              backgroundColor: showAddForm ? "#6b7280" : "#3399cc",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              transition: "background 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
            onMouseEnter={(e) => {
              if (!showAddForm) {
                e.target.style.backgroundColor = "#2a7ba0";
              }
            }}
            onMouseLeave={(e) => {
              if (!showAddForm) {
                e.target.style.backgroundColor = "#3399cc";
              }
            }}
          >
            {showAddForm ? "✕ Cancel" : "+ Add Product"}
          </button>
        )}
      </div>

      {!editing && showAddForm && (
        <ProductForm 
          submitLabel="Add Product" 
          onSubmit={(data) => {
            createProduct(data);
            setShowAddForm(false);
          }} 
          allowDiscount 
        />
      )}

      {editing && (
        <ProductForm
          submitLabel="Save Changes"
          onSubmit={(data) => {
            updateProduct(editing.id, data);
            setEditing(null);
          }}
          initial={editing}
          allowDiscount
          onProductUpdate={(updatedProduct) => {
            if (updatedProduct === null) {
              setEditing(null);
            } else {
              setEditing(updatedProduct);
            }
            fetchProducts();
          }}
        />
      )}

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: "40px",
        marginBottom: "20px"
      }}>
        <h3 style={{ margin: 0, fontSize: "22px", fontWeight: "600", color: "#333" }}>
          My Products ({filteredProducts.length})
        </h3>
      </div>

      {/* Search Bar and Filter */}
      <div style={{ 
        marginBottom: "24px",
        display: "flex",
        gap: "12px",
        alignItems: "center",
        flexWrap: "wrap"
      }}>
        <input
          type="text"
          placeholder="🔍 Search your products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: "200px",
            maxWidth: "500px",
            padding: "12px 16px",
            fontSize: "16px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            transition: "border-color 0.2s",
            boxSizing: "border-box"
          }}
          onFocus={(e) => e.target.style.borderColor = "#3399cc"}
          onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
        />
        
        {/* Category Filter */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: "12px 16px",
            fontSize: "16px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            cursor: "pointer",
            backgroundColor: "white",
            transition: "border-color 0.2s",
            boxSizing: "border-box",
            minWidth: "180px"
          }}
          onFocus={(e) => e.target.style.borderColor = "#3399cc"}
          onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
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
        
        {/* Discount Filter Toggle */}
        <button
          onClick={() => setShowDiscountedOnly(!showDiscountedOnly)}
          style={{
            padding: "12px 20px",
            fontSize: "16px",
            fontWeight: "600",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: showDiscountedOnly ? "#22c55e" : "#f3f4f6",
            color: showDiscountedOnly ? "white" : "#374151",
            border: showDiscountedOnly ? "none" : "1px solid #d1d5db"
          }}
          onMouseEnter={(e) => {
            if (!showDiscountedOnly) {
              e.target.style.backgroundColor = "#e5e7eb";
            }
          }}
          onMouseLeave={(e) => {
            if (!showDiscountedOnly) {
              e.target.style.backgroundColor = "#f3f4f6";
            }
          }}
        >
          {showDiscountedOnly ? "✓" : ""} 🏷️ Discounted Products
          {showDiscountedOnly && (
            <span style={{
              marginLeft: "4px",
              fontSize: "12px",
              opacity: 0.9
            }}>
              ({products.filter(p => parseFloat(p.discount || 0) > 0).length})
            </span>
          )}
        </button>

        {/* Out of Stock Filter Toggle */}
        <button
          onClick={() => setShowOutOfStockOnly(!showOutOfStockOnly)}
          style={{
            padding: "12px 20px",
            fontSize: "16px",
            fontWeight: "600",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: showOutOfStockOnly ? "#ef4444" : "#f3f4f6",
            color: showOutOfStockOnly ? "white" : "#374151",
            border: showOutOfStockOnly ? "none" : "1px solid #d1d5db"
          }}
          onMouseEnter={(e) => {
            if (!showOutOfStockOnly) {
              e.target.style.backgroundColor = "#e5e7eb";
            }
          }}
          onMouseLeave={(e) => {
            if (!showOutOfStockOnly) {
              e.target.style.backgroundColor = "#f3f4f6";
            }
          }}
        >
          {showOutOfStockOnly ? "✓" : ""} 📦 Out of Stock
          {showOutOfStockOnly && (
            <span style={{
              marginLeft: "4px",
              fontSize: "12px",
              opacity: 0.9
            }}>
              ({products.filter(p => parseInt(p.stock || 0) <= 0).length})
            </span>
          )}
        </button>
      </div>

      {/* Products Grid - Using same card style as Products page */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
        gap: "20px"
      }}>
        {filteredProducts.length === 0 && (
          <p>{searchQuery ? "No products found matching your search." : "No products yet. Add your first product!"}</p>
        )}

        {filteredProducts.map((p) => {
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
              {/* Clickable wrapper for entire card except buttons */}
              <Link 
                to={`/product/${p.id}`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: "80px", // Leave space for action buttons
                  zIndex: 1,
                  textDecoration: "none",
                  color: "inherit"
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

              {/* Price with discount indicator */}
              <div style={{ marginTop: "auto", position: "relative", zIndex: 0 }}>
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

                {p.soldCount !== undefined && (
                  <p style={{ margin: "4px 0", fontSize: "12px", color: "#999" }}>
                    <strong>Sold:</strong> {p.soldCount}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div 
                style={{ 
                  display: "flex", 
                  gap: "8px", 
                  marginTop: "8px",
                  position: "relative",
                  zIndex: 2
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(p);
                  }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProduct(p.id);
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 16px",
                    backgroundColor: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#b91c1c"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#dc2626"}
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
