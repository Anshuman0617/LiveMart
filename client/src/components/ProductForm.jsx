// client/src/components/ProductForm.jsx
import React, { useState, useEffect } from "react";
import { api, authHeader } from "../api";

export default function ProductForm({
  initial = {},
  onSubmit,
  submitLabel = "Save Product",
  allowDiscount = true,
  onProductUpdate, // Callback to refresh product data after image deletion
}) {
  const [title, setTitle] = useState(initial.title || "");
  const [description, setDescription] = useState(initial.description || "");
  const [price, setPrice] = useState(initial.price || "");
  const [discount, setDiscount] = useState(initial.discount || "");
  const [stock, setStock] = useState(initial.stock || 0);
  const [multiples, setMultiples] = useState(initial.multiples || 1);
  const [category, setCategory] = useState(initial.category || "Others");
  const [availabilityDate, setAvailabilityDate] = useState(
    initial.availabilityDate ? initial.availabilityDate.split('T')[0] : ""
  );

  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState(initial.images || []);
  const [previewImages, setPreviewImages] = useState([]);

  // Update existing images when initial changes
  useEffect(() => {
    setExistingImages(initial.images || []);
  }, [initial.images]);

  // Handle file selection with preview
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const currentTotal = existingImages.length + previewImages.length;
    const remainingSlots = 6 - currentTotal;
    
    if (remainingSlots <= 0) {
      alert("Maximum 6 images allowed. Please delete some images first.");
      e.target.value = "";
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      alert(`Only ${remainingSlots} image(s) can be added. Maximum 6 images total.`);
    }

    // Create preview URLs
    const newPreviews = filesToAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setPreviewImages([...previewImages, ...newPreviews]);
    setImages([...images, ...filesToAdd]);
    e.target.value = "";
  };

  // Delete existing image
  const handleDeleteExistingImage = async (imageIndex) => {
    if (!initial.id) {
      // If no product ID, just remove from state (for new products)
      const updated = existingImages.filter((_, idx) => idx !== imageIndex);
      setExistingImages(updated);
      return;
    }

    try {
      const res = await api.delete(`/products/${initial.id}/images/${imageIndex}`, {
        headers: authHeader()
      });
      
      setExistingImages(res.data.images || []);
      
      // Update initial if callback provided
      if (onProductUpdate) {
        onProductUpdate({ ...initial, images: res.data.images, imageUrl: res.data.imageUrl });
      }
    } catch (err) {
      console.error("Failed to delete image:", err);
      alert("Failed to delete image. Please try again.");
    }
  };

  // Delete preview image (not yet uploaded)
  const handleDeletePreviewImage = (previewIndex) => {
    const updatedPreviews = previewImages.filter((_, idx) => idx !== previewIndex);
    const updatedFiles = images.filter((_, idx) => idx !== previewIndex);
    
    // Revoke object URLs to prevent memory leaks
    URL.revokeObjectURL(previewImages[previewIndex].preview);
    
    setPreviewImages(updatedPreviews);
    setImages(updatedFiles);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const totalImages = existingImages.length + images.length;
    if (totalImages > 6) {
      alert("Maximum 6 images allowed. Please remove some images.");
      return;
    }

    const submitData = {
      title,
      description,
      price,
      stock,
      category: category || "Others",
      availabilityDate: availabilityDate || null,
      // Note: Products now use owner's address, not product-specific address
      images,
    };

    // Only include discount if allowed (for retailers)
    if (allowDiscount) {
      submitData.discount = discount || 0;
    }

    // Only include multiples for wholesalers
    if (!allowDiscount) {
      submitData.multiples = multiples || 1;
    }

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 40 }}>
      <div style={{
        backgroundColor: "#fff",
        border: "1px solid #e0e0e0",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        marginBottom: "30px"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
          paddingBottom: "16px",
          borderBottom: "2px solid #f0f0f0"
        }}>
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "600", color: "#333" }}>
            {submitLabel}
          </h2>
          {initial.id && (
            <button
              type="button"
              onClick={() => {
                setTitle(initial.title || "");
                setDescription(initial.description || "");
                setPrice(initial.price || "");
                setDiscount(initial.discount || "");
                setStock(initial.stock || 0);
                setMultiples(initial.multiples || 1);
                setImages([]);
                setPreviewImages([]);
                if (onProductUpdate) {
                  onProductUpdate(null);
                }
              }}
              style={{
                padding: "6px 12px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500"
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#e5e7eb"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "#f3f4f6"}
            >
              Cancel
            </button>
          )}
        </div>

        <div style={{ display: "grid", gap: "20px" }}>
          {/* Product Title */}
          <div>
            <label style={{ 
              display: "block", 
              marginBottom: "8px", 
              fontSize: "14px", 
              fontWeight: "600",
              color: "#374151"
            }}>
              Product Title <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              placeholder="Enter product title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                transition: "border-color 0.2s",
                boxSizing: "border-box"
              }}
              onFocus={(e) => e.target.style.borderColor = "#3399cc"}
              onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ 
              display: "block", 
              marginBottom: "8px", 
              fontSize: "14px", 
              fontWeight: "600",
              color: "#374151"
            }}>
              Description
            </label>
            <textarea
              placeholder="Enter product description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                resize: "vertical",
                fontFamily: "inherit",
                transition: "border-color 0.2s",
                boxSizing: "border-box"
              }}
              onFocus={(e) => e.target.style.borderColor = "#3399cc"}
              onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ 
              display: "block", 
              marginBottom: "8px", 
              fontSize: "14px", 
              fontWeight: "600",
              color: "#374151"
            }}>
              Category <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                transition: "border-color 0.2s",
                boxSizing: "border-box",
                cursor: "pointer",
                backgroundColor: "white"
              }}
              onFocus={(e) => e.target.style.borderColor = "#3399cc"}
              onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
            >
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
          </div>

          {/* Availability Date (for out of stock items) */}
          <div>
            <label style={{ 
              display: "block", 
              marginBottom: "8px", 
              fontSize: "14px", 
              fontWeight: "600",
              color: "#374151"
            }}>
              Availability Date (if out of stock)
            </label>
            <input
              type="date"
              value={availabilityDate}
              onChange={(e) => setAvailabilityDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                transition: "border-color 0.2s",
                boxSizing: "border-box"
              }}
              onFocus={(e) => e.target.style.borderColor = "#3399cc"}
              onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
            />
            <p style={{ 
              margin: "4px 0 0 0", 
              fontSize: "12px", 
              color: "#6b7280"
            }}>
              Set when this item will be back in stock (only shown when stock is 0)
            </p>
          </div>

          {/* Price and Stock Row */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: allowDiscount ? "1fr 1fr 1fr" : "1fr 1fr",
            gap: "16px"
          }}>
            {/* Price */}
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                fontSize: "14px", 
                fontWeight: "600",
                color: "#374151"
              }}>
                Price per Unit (₹) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = "#3399cc"}
                onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
              />
            </div>

            {/* Discount (if allowed) */}
            {allowDiscount && (
              <div>
                <label style={{ 
                  display: "block", 
                  marginBottom: "8px", 
                  fontSize: "14px", 
                  fontWeight: "600",
                  color: "#374151"
                }}>
                  Discount (%)
                </label>
                <input
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  type="number"
                  min="0"
                  max="100"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "16px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#3399cc"}
                  onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                />
                {discount > 0 && (
                  <p style={{ 
                    margin: "4px 0 0 0", 
                    fontSize: "12px", 
                    color: "#22c55e",
                    fontWeight: "500"
                  }}>
                    Final price: ₹{((parseFloat(price) || 0) * (1 - parseFloat(discount) / 100)).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Stock */}
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                fontSize: "14px", 
                fontWeight: "600",
                color: "#374151"
              }}>
                Stock {!allowDiscount ? "(in multiples)" : ""} <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                placeholder="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                type="number"
                min="0"
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = "#3399cc"}
                onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
              />
              {!allowDiscount && (
                <p style={{ 
                  margin: "4px 0 0 0", 
                  fontSize: "12px", 
                  color: "#6b7280"
                }}>
                  Stock is counted in multiples. If multiples is 5 and stock is 10, you have 50 units total.
                </p>
              )}
            </div>

            {/* Multiples (for wholesalers only) */}
            {!allowDiscount && (
              <div>
                <label style={{ 
                  display: "block", 
                  marginBottom: "8px", 
                  fontSize: "14px", 
                  fontWeight: "600",
                  color: "#374151"
                }}>
                  Order Multiples
                </label>
                <input
                  placeholder="1"
                  value={multiples}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setMultiples(val < 1 ? 1 : val);
                  }}
                  type="number"
                  min="1"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "16px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#3399cc"}
                  onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                />
                <p style={{ 
                  margin: "4px 0 0 0", 
                  fontSize: "12px", 
                  color: "#6b7280"
                }}>
                  Retailers can only order in multiples of this number (e.g., if set to 5, they can order 5, 10, 15, etc.). The price shown will be: (Price per Unit × Multiples) per order.
                </p>
              </div>
            )}
          </div>

          {/* Info Message */}
          <div style={{
            padding: "12px",
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            marginTop: "8px"
          }}>
            <p style={{ 
              margin: 0, 
              fontSize: '13px', 
              color: '#1e40af',
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <span>ℹ️</span>
              <span>Product location will use your profile address. Update it in your profile settings.</span>
            </p>
          </div>
        </div>

        {/* Image Upload Section */}
        <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "2px solid #f0f0f0" }}>
          <label style={{ 
            display: "block", 
            marginBottom: "12px", 
            fontSize: "16px", 
            fontWeight: "600",
            color: "#374151"
          }}>
            Product Images (up to 6)
          </label>
          
          <div style={{
            position: "relative",
            border: "2px dashed #d1d5db",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            backgroundColor: existingImages.length + previewImages.length >= 6 ? "#f9fafb" : "#fafafa",
            transition: "all 0.2s",
            cursor: existingImages.length + previewImages.length >= 6 ? "not-allowed" : "pointer"
          }}
          onMouseEnter={(e) => {
            if (existingImages.length + previewImages.length < 6) {
              e.currentTarget.style.borderColor = "#3399cc";
              e.currentTarget.style.backgroundColor = "#f0f9ff";
            }
          }}
          onMouseLeave={(e) => {
            if (existingImages.length + previewImages.length < 6) {
              e.currentTarget.style.borderColor = "#d1d5db";
              e.currentTarget.style.backgroundColor = "#fafafa";
            }
          }}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              disabled={existingImages.length + previewImages.length >= 6}
              style={{ 
                position: "absolute",
                width: "100%",
                height: "100%",
                opacity: 0,
                cursor: existingImages.length + previewImages.length >= 6 ? "not-allowed" : "pointer",
                left: 0,
                top: 0,
                zIndex: 1
              }}
              id="image-upload-input"
            />
            <label 
              htmlFor="image-upload-input"
              style={{
                display: "block",
                cursor: existingImages.length + previewImages.length >= 6 ? "not-allowed" : "pointer",
                pointerEvents: existingImages.length + previewImages.length >= 6 ? "none" : "auto"
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>📷</div>
              <p style={{ 
                margin: "8px 0", 
                fontSize: "14px", 
                color: existingImages.length + previewImages.length >= 6 ? "#9ca3af" : "#6b7280",
                fontWeight: "500"
              }}>
                {existingImages.length + previewImages.length >= 6 
                  ? "Maximum 6 images reached"
                  : "Click to upload or drag and drop"}
              </p>
              <p style={{ 
                margin: "4px 0 0 0", 
                fontSize: "12px", 
                color: "#9ca3af"
              }}>
                {existingImages.length + previewImages.length} / 6 images
              </p>
            </label>
          </div>

          {/* Show existing images with delete buttons */}
          {(existingImages.length > 0 || previewImages.length > 0) && (
            <div style={{ marginTop: "20px" }}>
              <p style={{ 
                margin: "0 0 12px 0", 
                fontSize: "14px", 
                fontWeight: "600",
                color: "#374151"
              }}>
                Current Images:
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: "16px",
                }}
              >
                {/* Existing images from server */}
                {existingImages.map((img, idx) => (
                  <div key={`existing-${idx}`} style={{ 
                    position: "relative",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "2px solid #e5e7eb",
                    backgroundColor: "#f9fafb"
                  }}>
                    <img
                      src={`http://localhost:4000${img}`}
                      alt={`Product ${idx + 1}`}
                      style={{
                        width: "100%",
                        height: "140px",
                        objectFit: "cover",
                        display: "block"
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteExistingImage(idx)}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        background: "#dc2626",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "32px",
                        height: "32px",
                        cursor: "pointer",
                        fontSize: "18px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                        transition: "transform 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = "scale(1.1)";
                        e.target.style.background = "#b91c1c";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "scale(1)";
                        e.target.style.background = "#dc2626";
                      }}
                      title="Delete image"
                    >
                      ×
                    </button>
                    <div style={{
                      position: "absolute",
                      bottom: "8px",
                      left: "8px",
                      background: "rgba(0,0,0,0.7)",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "600"
                    }}>
                      Image {idx + 1}
                    </div>
                  </div>
                ))}

                {/* Preview images (newly selected, not yet uploaded) */}
                {previewImages.map((preview, idx) => (
                  <div key={`preview-${idx}`} style={{ 
                    position: "relative",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "2px solid #4ade80",
                    backgroundColor: "#f0fdf4"
                  }}>
                    <img
                      src={preview.preview}
                      alt={`Preview ${idx + 1}`}
                      style={{
                        width: "100%",
                        height: "140px",
                        objectFit: "cover",
                        display: "block"
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeletePreviewImage(idx)}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        background: "#dc2626",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "32px",
                        height: "32px",
                        cursor: "pointer",
                        fontSize: "18px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                        transition: "transform 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = "scale(1.1)";
                        e.target.style.background = "#b91c1c";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "scale(1)";
                        e.target.style.background = "#dc2626";
                      }}
                      title="Remove image"
                    >
                      ×
                    </button>
                    <div style={{
                      position: "absolute",
                      bottom: "8px",
                      left: "8px",
                      background: "#4ade80",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "600"
                    }}>
                      New
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div style={{ 
          marginTop: "24px", 
          paddingTop: "24px", 
          borderTop: "2px solid #f0f0f0",
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end"
        }}>
          {initial.id && (
            <button
              type="button"
              onClick={() => {
                setTitle(initial.title || "");
                setDescription(initial.description || "");
                setPrice(initial.price || "");
                setDiscount(initial.discount || "");
                setStock(initial.stock || 0);
                setMultiples(initial.multiples || 1);
                setCategory(initial.category || "Others");
                setAvailabilityDate(initial.availabilityDate ? initial.availabilityDate.split('T')[0] : "");
                setImages([]);
                setPreviewImages([]);
                if (onProductUpdate) {
                  onProductUpdate(null);
                }
              }}
              style={{
                padding: "12px 24px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "600",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#e5e7eb";
                e.target.style.borderColor = "#9ca3af";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#f3f4f6";
                e.target.style.borderColor = "#d1d5db";
              }}
            >
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            style={{ 
              padding: "12px 32px",
              backgroundColor: "#3399cc",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              transition: "background 0.2s",
              boxShadow: "0 2px 4px rgba(51, 153, 204, 0.3)"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#2a7ba0"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#3399cc"}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
