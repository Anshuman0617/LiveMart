// client/src/components/ProductForm.jsx
import React, { useState } from "react";

export default function ProductForm({
  initial = {},
  onSubmit,
  submitLabel = "Save Product",
  allowDiscount = true,
}) {
  const [title, setTitle] = useState(initial.title || "");
  const [description, setDescription] = useState(initial.description || "");
  const [price, setPrice] = useState(initial.price || "");
  const [discount, setDiscount] = useState(initial.discount || "");
  const [stock, setStock] = useState(initial.stock || 0);

  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState(initial.images || []);

  const handleSubmit = (e) => {
    e.preventDefault();

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
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setImages(e.target.files)}
          style={{ marginTop: 5, width: "100%" }}
        />
        <small style={{ display: "block", marginTop: 5, color: "#666" }}>
          You can select multiple images. New images will be added to existing ones.
        </small>

        {/* Show existing images */}
        {existingImages.length > 0 && (
          <div style={{ marginTop: 15 }}>
            <p><strong>Current Images:</strong></p>
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              {existingImages.map((img, idx) => (
                <div key={idx} style={{ position: "relative" }}>
                  <img
                    src={`http://localhost:4000${img}`}
                    alt={`Product ${idx + 1}`}
                    style={{
                      width: 100,
                      height: 100,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "2px solid #ddd",
                    }}
                  />
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
