// client/src/pages/ProductDetail.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useParams } from "react-router-dom";
import Reviews from "../components/Reviews";

export default function ProductDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);

  useEffect(() => {
    api.get(`/products/${id}`)
      .then((res) => setP(res.data))
      .catch((err) => console.error(err));
  }, [id]);

  if (!p) return <div className="App">Loading...</div>;

  return (
    <div className="App">
      <h2>{p.title}</h2>

      {p.imageUrl && (
        <img
          src={`http://localhost:4000${p.imageUrl}`}
          style={{
            width: "100%",
            maxWidth: 500,
            height: "auto",
            borderRadius: 12,
            marginBottom: 20,
          }}
        />
      )}

      <p>{p.description}</p>
      <p><strong>Price:</strong> ₹{p.price}</p>
      {p.discount ? <p><strong>Discount:</strong> {p.discount}%</p> : null}
      <p><strong>Sold:</strong> {p.soldCount}</p>

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

      <Reviews productId={p.id} />
    </div>
  );
}
