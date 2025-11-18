// client/src/pages/ProductDetail.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useParams } from "react-router-dom";
import Reviews from "../components/Reviews";

export default function ProductDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    api.get(`/products/${id}`)
      .then((res) => {
        setP(res.data);
        // Reset main image index when product changes
        setMainImageIndex(0);
      })
      .catch((err) => console.error(err));
  }, [id]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!p) return <div className="App">Loading...</div>;

  // Get all images (use images array if available, otherwise fallback to imageUrl)
  const allImages = (p.images && p.images.length > 0) ? p.images : (p.imageUrl ? [p.imageUrl] : []);

  const openModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedImage(null);
  };

  const switchMainImage = (index) => {
    setMainImageIndex(index);
  };

  // Get current user
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isRegularUser = !user || (user.role !== 'retailer' && user.role !== 'wholesaler');

  const handleAddToCart = () => {
    if (!user) {
      alert("Please login to add items to cart");
      return;
    }

    // Check if product is out of stock
    if (p.stock !== undefined && p.stock !== null && p.stock <= 0) {
      alert("This product is out of stock!");
      return;
    }
    
    const userId = user.id;
    const cartKey = userId ? `cart_${userId}` : 'cart';
    const cart = JSON.parse(localStorage.getItem(cartKey) || "[]");
    const existing = cart.find((c) => c.productId === p.id);

    const maxQuantity = Math.min(10, p.stock || 10);

    if (existing) {
      if (existing.quantity >= maxQuantity) {
        alert(`Maximum ${maxQuantity} items allowed for this product.`);
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
    alert("Added to cart!");
  };

  return (
    <div className="App">
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
          <p style={{ margin: "0 0 12px 0", fontSize: "24px", fontWeight: "bold" }}>
            <strong>Price:</strong> ₹{(p.price*(1-p.discount/100)).toFixed(2)}
          </p>
          {p.discount && (
            <p style={{ margin: "0 0 12px 0" }}>
              <strong>Discount:</strong> {p.discount}%
            </p>
          )}
          <p style={{ margin: "0 0 12px 0" }}>
            <strong>Sold:</strong> {p.soldCount}
          </p>

          {/* Stock indicator */}
          {p.stock !== undefined && p.stock !== null && (
            <p style={{ margin: "8px 0" }}>
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
        </div>
      </div>

      {/* Description - Below product info */}
      <div style={{ marginBottom: 20 }}>
        <p>{p.description}</p>
      </div>

      {/* Image Modal */}
      {showModal && selectedImage && (
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
            >
              Open in Google Maps
            </a>
          )}
        </div>
      )}

      <br />
      <br />

      <Reviews productId={p.id} allowReviewForm={isRegularUser} />
    </div>
  );
}
