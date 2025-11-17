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

    onSubmit({
      title,
      description,
      price,
      discount: allowDiscount ? discount : 0,
      stock,
      // Note: Products now use owner's address, not product-specific address
      images,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 30 }}>
      <h3>{submitLabel}</h3>

      <input
        placeholder="Product Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        placeholder="Price"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        type="number"
        step="0.01"
      />

      {allowDiscount && (
        <input
          placeholder="Discount (%)"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          type="number"
        />
      )}

      <input
        placeholder="Stock"
        value={stock}
        onChange={(e) => setStock(e.target.value)}
        type="number"
      />

      <div style={{ marginTop: 10 }}>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          ℹ️ Product location will use your profile address. Update it in your profile settings.
        </p>
      </div>

      <div style={{ marginTop: 10 }}>
        <label>
          <strong>Product Images (up to 6):</strong>
        </label>
        <div style={{ marginTop: 5 }}>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageChange}
            style={{ width: "100%" }}
            disabled={existingImages.length + previewImages.length >= 6}
          />
          <small style={{ display: "block", marginTop: 5, color: "#666" }}>
            {existingImages.length + previewImages.length} / 6 images. 
            {existingImages.length + previewImages.length >= 6 
              ? " Maximum reached. Delete images to add more."
              : " You can select multiple images. New images will be added to existing ones."}
          </small>
        </div>

        {/* Show existing images with delete buttons */}
        {(existingImages.length > 0 || previewImages.length > 0) && (
          <div style={{ marginTop: 15 }}>
            <p><strong>Current Images:</strong></p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: 15,
                marginTop: 10,
              }}
            >
              {/* Existing images from server */}
              {existingImages.map((img, idx) => (
                <div key={`existing-${idx}`} style={{ position: "relative" }}>
                  <img
                    src={`http://localhost:4000${img}`}
                    alt={`Product ${idx + 1}`}
                    style={{
                      width: "100%",
                      height: "120px",
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "2px solid #ddd",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteExistingImage(idx)}
                    style={{
                      position: "absolute",
                      top: 5,
                      right: 5,
                      background: "#dc2626",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: "28px",
                      height: "28px",
                      cursor: "pointer",
                      fontSize: "16px",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                    }}
                    title="Delete image"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Preview images (newly selected, not yet uploaded) */}
              {previewImages.map((preview, idx) => (
                <div key={`preview-${idx}`} style={{ position: "relative" }}>
                  <img
                    src={preview.preview}
                    alt={`Preview ${idx + 1}`}
                    style={{
                      width: "100%",
                      height: "120px",
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "2px solid #4ade80",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleDeletePreviewImage(idx)}
                    style={{
                      position: "absolute",
                      top: 5,
                      right: 5,
                      background: "#dc2626",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: "28px",
                      height: "28px",
                      cursor: "pointer",
                      fontSize: "16px",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                    }}
                    title="Remove image"
                  >
                    ×
                  </button>
                  <div style={{
                    position: "absolute",
                    bottom: 5,
                    left: 5,
                    background: "#4ade80",
                    color: "white",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "10px",
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

      <button type="submit" style={{ marginTop: 12 }}>
        {submitLabel}
      </button>
    </form>
  );
}
