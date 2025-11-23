// client/src/pages/ProductDetail.jsx
import React, { useEffect, useState } from "react";
import { api, authHeader } from "../api";
import { useParams } from "react-router-dom";
import Reviews from "../components/Reviews";
import Questions from "../components/Questions";
import { trackProductView } from "../utils/browsingHistory.js";
import { useModal } from "../hooks/useModal";

export default function ProductDetail() {
  const { id } = useParams();
  const { showModal, ModalComponent } = useModal();
  const [p, setP] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    setError(null);
    api.get(`/products/${id}`)
      .then((res) => {
        const product = res.data;
        setP(product);
        // Reset main image index when product changes
        setMainImageIndex(0);
        
        // Track product view for recommendations
        if (product) {
          trackProductView(
            product.id,
            product.category || 'Others',
            product.ownerType || 'retailer'
          );
        }
      })
      .catch((err) => {
        if (err.response?.status === 403) {
          setError("Access denied. This product is only available to retailers.");
          // Don't log 403 errors to console - they're expected for access control
        } else if (err.response?.status === 404) {
          setError("Product not found.");
          console.error("ProductDetail 404:", err);
        } else {
          setError("Failed to load product. Please try again.");
          console.error("ProductDetail error:", err);
        }
      });
  }, [id]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (error) {
    return (
      <div className="App" style={{ padding: 40, textAlign: "center" }}>
        <h2 style={{ color: "#dc2626" }}>Error</h2>
        <p>{error}</p>
        <button
          onClick={() => window.history.back()}
          style={{
            marginTop: 20,
            padding: "12px 24px",
            fontSize: "16px",
            background: "#3399cc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!p) return <div className="App">Loading...</div>;

  // Get all images (use images array if available, otherwise fallback to imageUrl)
  const allImages = (p.images && p.images.length > 0) ? p.images : (p.imageUrl ? [p.imageUrl] : []);

  const openModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const closeModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  const switchMainImage = (index) => {
    setMainImageIndex(index);
  };

  // Get current user
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isRegularUser = !user || (user.role !== 'retailer' && user.role !== 'wholesaler');
  const isRetailer = user && user.role === 'retailer';
  const isWholesalerProduct = p ? p.ownerType === 'wholesaler' : false;

  const addToRetailerList = async (productId) => {
    try {
      const res = await api.post(`/products/${productId}/add-to-retailer-list`, {}, {
        headers: authHeader()
      });
      showModal(res.data.message || "Product added to your product list!", "Success", "success");
    } catch (err) {
      console.error("Failed to add product to list:", err);
      showModal(err.response?.data?.error || "Failed to add product to your list. Please try again.", "Error", "error");
    }
  };

  const addToWholesaleCart = () => {
    if (!user) {
      showModal("Please login to add items to cart", "Login Required", "warning");
      return;
    }

    // Check if product is out of stock
    if (p.stock !== undefined && p.stock !== null && p.stock <= 0) {
      showModal("This product is out of stock!", "Out of Stock", "warning");
      return;
    }

    const numMultiples = parseInt(quantity || 1, 10); // Number of multiples user wants to order
    if (numMultiples < 1) {
      showModal("Quantity must be at least 1", "Invalid Quantity", "warning");
      return;
    }

    const multiples = p.multiples || 1;
    const maxMultiples = p.stock || 0; // Stock is in multiples
    const totalUnitsAvailable = maxMultiples * multiples; // Total units available
    const totalUnitsOrdered = numMultiples * multiples; // Total units user wants to order
    
    // Validate that user doesn't exceed available stock (in multiples)
    if (numMultiples > maxMultiples) {
      showModal(`Only ${maxMultiples} multiple${maxMultiples !== 1 ? 's' : ''} (${totalUnitsAvailable} units) available in stock.`, "Stock Limit", "warning");
      setQuantity("");
      return;
    }

    // Get user-specific wholesale cart
    const userId = user.id;
    const cartKey = userId ? `wholesaleCart_${userId}` : 'wholesaleCart';
    const cart = JSON.parse(localStorage.getItem(cartKey) || "[]");
    const existing = cart.find((c) => c.productId === p.id);

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
          showModal(`Cannot add ${numMultiples} multiple${numMultiples !== 1 ? 's' : ''} (${totalUnitsOrdered} units). The total quantity would be ${newTotalUnits} units, which is not a multiple of ${multiples}. The next valid quantity (${nextValidUnits} units = ${nextValidMultiples} multiples) exceeds available stock (${maxMultiples} multiples = ${totalUnitsAvailable} units).`, "Stock Limit Exceeded", "warning");
          setQuantity("");
          return;
        }
        showModal(`Adding ${numMultiples} multiple${numMultiples !== 1 ? 's' : ''} (${totalUnitsOrdered} units) would result in ${newTotalUnits} total units, which is not a multiple of ${multiples}. Adjusting to ${nextValidUnits} units (${nextValidMultiples} multiples).`, "Quantity Adjusted", "info");
        existing.quantity = nextValidUnits;
      } else if (newTotalMultiples > maxMultiples) {
        showModal(`Only ${maxMultiples} multiple${maxMultiples !== 1 ? 's' : ''} (${totalUnitsAvailable} units) available in stock. You already have ${existingUnits} units (${existingUnits / multiples} multiples) in your cart.`, "Stock Limit", "warning");
        setQuantity("");
        return;
      } else {
        existing.quantity = newTotalUnits;
      }
    } else {
      cart.push({
        productId: p.id,
        title: p.title,
        price: p.price,
        quantity: totalUnitsOrdered, // Store as actual units
        multiples: multiples, // Store the size of each multiple
      });
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));
    showModal("Added to wholesale cart!", "Success", "success");
    // Reset quantity input
    setQuantity("");
  };

  const handleAddToCart = () => {
    if (!user) {
      showModal("Please login to add items to cart", "Login Required", "warning");
      return;
    }

    // Check if product is out of stock
    if (p.stock !== undefined && p.stock !== null && p.stock <= 0) {
      showModal("This product is out of stock!", "Out of Stock", "warning");
      return;
    }
    
    const userId = user.id;
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
  };

  return (
    <div className="App">
      <ModalComponent />
      {/* Main Container: Image Gallery and Product Info */}
      <div
        style={{
          display: "flex",
          flexDirection: windowWidth > 768 ? "row" : "column",
          gap: 20,
          marginBottom: 20,
          alignItems: "flex-start",
        }}
      >
        {/* Image Gallery Container */}
        {allImages.length > 0 && (
          <div style={{ display: "flex", gap: 15, alignItems: "flex-start", flex: "0 0 auto" }}>
            {/* Main Image */}
            <div style={{ flex: 1, maxWidth: 500, minWidth: 300 }}>
              <img
                src={`http://localhost:4000${allImages[mainImageIndex]}`}
                alt={p.title}
                onClick={() => openModal(allImages[mainImageIndex])}
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: 12,
                  cursor: "pointer",
                  border: "2px solid #ddd",
                }}
              />
            </div>

            {/* Thumbnail Gallery - Stacked in column */}
            {allImages.length > 1 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {allImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={`http://localhost:4000${img}`}
                    alt={`${p.title} ${idx + 1}`}
                    onClick={() => switchMainImage(idx)}
                    style={{
                      width: 80,
                      height: 80,
                      objectFit: "cover",
                      borderRadius: 8,
                      cursor: "pointer",
                      border: idx === mainImageIndex ? "3px solid #3399cc" : "2px solid #ddd",
                      opacity: idx === mainImageIndex ? 1 : 0.7,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.opacity = idx === mainImageIndex ? "1" : "0.7")
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Product Info Box */}
        <div
          style={{
            backgroundColor: "#f5f5f5",
            borderRadius: 12,
            padding: 20,
            flex: windowWidth > 768 ? "1 1 auto" : "1 1 100%",
            minWidth: windowWidth > 768 ? 250 : "auto",
            maxWidth: windowWidth > 768 ? 400 : "100%",
          }}
        >
          <h2 style={{ margin: "0 0 16px 0", fontSize: "28px", fontWeight: "bold" }}>
            {p.title}
          </h2>
          
          {/* Star Rating */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "2px" }}>
              {(() => {
                const rating = p.ratingAvg || 0;
                const reviewsCount = p.reviewsCount || 0;
                const fullStars = Math.floor(rating);
                const hasHalfStar = rating % 1 >= 0.5;
                
                return [1, 2, 3, 4, 5].map((star) => {
                  if (rating === 0) {
                    return <span key={star} style={{ fontSize: "20px", color: "#d1d5db" }}>☆</span>;
                  }
                  if (star <= fullStars) {
                    return <span key={star} style={{ fontSize: "20px", color: "#fbbf24" }}>★</span>;
                  }
                  if (hasHalfStar && star === fullStars + 1) {
                    return <span key={star} style={{ fontSize: "20px", color: "#fbbf24", opacity: 0.6 }}>★</span>;
                  }
                  return <span key={star} style={{ fontSize: "20px", color: "#d1d5db" }}>☆</span>;
                });
              })()}
            </div>
            {p.ratingAvg > 0 ? (
              <span style={{ fontSize: "16px", color: "#666" }}>
                {p.ratingAvg.toFixed(1)} ({p.reviewsCount || 0} {(p.reviewsCount || 0) === 1 ? 'review' : 'reviews'})
              </span>
            ) : (
              <span style={{ fontSize: "16px", color: "#999" }}>No ratings yet</span>
            )}
          </div>
          
          {/* Price Display */}
          {p.ownerType === 'wholesaler' && p.multiples && p.multiples > 1 ? (
            <div style={{ margin: "0 0 12px 0" }}>
              <p style={{ margin: "0 0 4px 0", fontSize: "24px", fontWeight: "bold" }}>
                <strong>Price per Multiple:</strong> ₹{(parseFloat(p.price || 0) * (p.multiples || 1)).toFixed(2)}
              </p>
              <p style={{ margin: "0", fontSize: "16px", color: "#666" }}>
                <strong>Price per Unit:</strong> ₹{parseFloat(p.price || 0).toFixed(2)} (×{p.multiples} units per multiple)
              </p>
            </div>
          ) : (
            <p style={{ margin: "0 0 12px 0", fontSize: "24px", fontWeight: "bold" }}>
              <strong>Price:</strong> ₹{(parseFloat(p.price || 0) * (1 - (parseFloat(p.discount || 0) / 100))).toFixed(2)}
            </p>
          )}
          {p.discount && p.discount > 0 && (
            <p style={{ margin: "0 0 12px 0" }}>
              <strong>Discount:</strong> {p.discount}%
            </p>
          )}
          {/* Retailer details for consumers (hide sold count) */}
          {(() => {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            const isConsumer = !user || user.role === 'customer';
            
            if (!isConsumer && p.soldCount !== undefined) {
              // Show sold count for retailers/wholesalers only
              return (
                <p style={{ margin: "0 0 12px 0" }}>
                  <strong>Sold:</strong> {p.soldCount}
                </p>
              );
            }
            return null;
          })()}

          {/* Stock indicator */}
          {p.stock !== undefined && p.stock !== null && (() => {
            const multiples = p.multiples || 1;
            const totalUnits = p.stock * multiples;
            return (
              <p style={{ margin: "8px 0" }}>
                <strong>Stock:</strong> {totalUnits} units
                {p.ownerType === 'wholesaler' && multiples > 1 && (
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
          
          {/* Multiples indicator for wholesaler products */}
          {p.ownerType === 'wholesaler' && p.multiples && p.multiples > 1 && (
            <p style={{ margin: "8px 0", fontSize: "14px", color: "#f59e0b", fontWeight: "600" }}>
              ⚠️ This product must be ordered in multiples of {p.multiples} (e.g., {p.multiples}, {p.multiples * 2}, {p.multiples * 3}, ...)
            </p>
          )}
          
          {/* Add to Cart Button - Only for regular users */}
          {isRegularUser && (
            <button
              onClick={handleAddToCart}
              disabled={p.stock !== undefined && p.stock !== null && p.stock <= 0}
              style={{
                marginTop: 16,
                padding: "12px 24px",
                fontSize: "16px",
                fontWeight: "bold",
                backgroundColor: (p.stock !== undefined && p.stock !== null && p.stock <= 0) ? "#9ca3af" : "#3399cc",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: (p.stock !== undefined && p.stock !== null && p.stock <= 0) ? "not-allowed" : "pointer",
                width: "100%",
                opacity: (p.stock !== undefined && p.stock !== null && p.stock <= 0) ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!(p.stock !== undefined && p.stock !== null && p.stock <= 0)) {
                  e.currentTarget.style.backgroundColor = "#2a7ba0";
                }
              }}
              onMouseLeave={(e) => {
                if (!(p.stock !== undefined && p.stock !== null && p.stock <= 0)) {
                  e.currentTarget.style.backgroundColor = "#3399cc";
                }
              }}
            >
              {(p.stock !== undefined && p.stock !== null && p.stock <= 0) ? "Out of Stock" : "Add to Cart"}
            </button>
          )}

          {/* Quantity and Add to Cart - For retailers viewing wholesaler products */}
          {isRetailer && isWholesalerProduct && (
            <div style={{ marginTop: 16 }}>
              <div style={{ 
                display: "flex", 
                gap: "10px", 
                alignItems: "center", 
                flexDirection: "column"
              }}>
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
                      value={quantity}
                      onChange={(e) => {
                        if (p.stock !== undefined && p.stock !== null && p.stock <= 0) {
                          return;
                        }
                        const val = e.target.value;
                        if (!val) {
                          setQuantity("");
                          return;
                        }
                        const numVal = parseInt(val);
                        const maxMultiples = p.stock || 0; // Stock is in multiples
                        
                        // Validate that user doesn't exceed available stock (in multiples)
                        if (numVal > maxMultiples) {
                          const multiples = p.multiples || 1;
                          const totalUnits = maxMultiples * multiples;
                          showModal(`Only ${maxMultiples} multiple${maxMultiples !== 1 ? 's' : ''} (${totalUnits} units) available in stock.`, "Stock Limit", "warning");
                          return;
                        }
                        
                        // Allow any positive integer - user is entering number of multiples
                        setQuantity(val);
                      }}
                    />
                    {p.multiples && p.multiples > 1 && quantity && (
                      <p style={{ margin: 0, fontSize: "11px", color: "#6b7280" }}>
                        = {parseInt(quantity) * p.multiples} units
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                    <button 
                      onClick={addToRetailerList.bind(null, p.id)}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#22c55e",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                        transition: "background 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = "#16a34a"}
                      onMouseLeave={(e) => e.target.style.backgroundColor = "#22c55e"}
                      title="Add to My Products List"
                    >
                      +
                    </button>
                    <button 
                      onClick={addToWholesaleCart}
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
                {p.multiples && p.multiples > 1 && (
                  <p style={{ margin: "4px 0", fontSize: "11px", color: "#6b7280", width: "100%" }}>
                    Enter number of multiples (each multiple = {p.multiples} units)
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description - Below product info */}
      <div style={{ marginBottom: 20 }}>
        <p>{p.description}</p>
      </div>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            cursor: "pointer",
          }}
          onClick={closeModal}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90%",
              maxHeight: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              style={{
                position: "absolute",
                top: -40,
                right: 0,
                background: "rgba(255, 255, 255, 0.9)",
                color: "#000",
                border: "2px solid #000",
                borderRadius: "50%",
                width: 40,
                height: 40,
                fontSize: "28px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                fontWeight: "bold",
              }}
            >
              ×
            </button>
            <img
              src={`http://localhost:4000${selectedImage}`}
              alt={p.title}
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                borderRadius: 8,
              }}
            />
            {/* Navigation arrows */}
            {allImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIdx = allImages.indexOf(selectedImage);
                    const prevIdx =
                      currentIdx > 0 ? currentIdx - 1 : allImages.length - 1;
                    setSelectedImage(allImages[prevIdx]);
                  }}
                  style={{
                    position: "absolute",
                    left: 20,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(0, 0, 0, 0.7)",
                    color: "#fff",
                    border: "2px solid #fff",
                    borderRadius: "50%",
                    width: 50,
                    height: 50,
                    fontSize: "28px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                  }}
                >
                  ‹
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIdx = allImages.indexOf(selectedImage);
                    const nextIdx =
                      currentIdx < allImages.length - 1 ? currentIdx + 1 : 0;
                    setSelectedImage(allImages[nextIdx]);
                  }}
                  style={{
                    position: "absolute",
                    right: 20,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(0, 0, 0, 0.7)",
                    color: "#fff",
                    border: "2px solid #fff",
                    borderRadius: "50%",
                    width: 50,
                    height: 50,
                    fontSize: "28px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                  }}
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <br />

      <h3>Seller Info</h3>
      <p>
        {p.owner?.name} ({p.owner?.role})
      </p>

      {p.owner?.address && (
        <div style={{ marginTop: 10 }}>
          <p><strong>Address:</strong> {p.owner.address}</p>

          {p.owner.lat && p.owner.lng && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${p.owner.lat},${p.owner.lng}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#3399cc', textDecoration: 'underline' }}
            >
              Open in Google Maps
            </a>
          )}
        </div>
      )}

      {/* Retailer Contact Information */}
      {p.owner && p.ownerType === 'retailer' && (
        <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#1e40af' }}>
            📞 Contact Retailer
          </p>
          {p.owner.phone && (
            <p style={{ margin: '4px 0', fontSize: '14px' }}>
              <strong>Phone:</strong> <a href={`tel:${p.owner.phone}`} style={{ color: '#3399cc', textDecoration: 'none' }}>{p.owner.phone}</a>
            </p>
          )}
          {p.owner.email && (
            <p style={{ margin: '4px 0', fontSize: '14px' }}>
              <strong>Email:</strong> <a href={`mailto:${p.owner.email}`} style={{ color: '#3399cc', textDecoration: 'none' }}>{p.owner.email}</a>
            </p>
          )}
        </div>
      )}

      {/* Questions & Answers Section - Hide for retailers viewing wholesaler products */}
      {!(isRetailer && isWholesalerProduct) && (
        <>
          <br />
          <br />
          <Questions 
            productId={p.id} 
            productOwnerId={p.ownerId}
            allowQuestionForm={isRegularUser} 
          />
        </>
      )}

      {/* Reviews Section - Hide for retailers viewing wholesaler products */}
      {!(isRetailer && isWholesalerProduct) && (
        <>
          <br />
          <br />
          <Reviews 
            productId={p.id} 
            allowReviewForm={isRegularUser}
            productOwnerId={p.ownerId}
          />
        </>
      )}
    </div>
  );
}
