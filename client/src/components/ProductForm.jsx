// client/src/components/ProductForm.jsx
import React, { useState } from "react";
import AddressAutocomplete from "./AddressAutocomplete";

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

  const [latLng, setLatLng] = useState({
    lat: initial.lat || null,
    lng: initial.lng || null,
  });
  const [address, setAddress] = useState(initial.address || "");

  const [images, setImages] = useState([]);

  const handlePlaceSelected = (addr, place) => {
    setAddress(addr);
    if (place?.geometry?.location) {
      setLatLng({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    onSubmit({
      title,
      description,
      price,
      discount: allowDiscount ? discount : 0,
      stock,
      lat: latLng.lat,
      lng: latLng.lng,
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

      <AddressAutocomplete
        placeholder="Seller address (optional)"
        value={address}
        onChange={setAddress}
        onPlaceSelected={handlePlaceSelected}
      />

      <input
        type="file"
        multiple
        onChange={(e) => setImages(e.target.files)}
        style={{ marginTop: 10 }}
      />

      <button type="submit" style={{ marginTop: 12 }}>
        {submitLabel}
      </button>
    </form>
  );
}
