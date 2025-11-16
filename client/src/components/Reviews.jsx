// client/src/components/Reviews.jsx
import React, { useEffect, useState } from "react";
import { api, authHeader } from "../api";

export default function Reviews({ productId }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState("");
  const [text, setText] = useState("");

  const load = async () => {
    const res = await api.get(`/reviews/${productId}`);
    setReviews(res.data);
  };

  useEffect(() => {
    load();
  }, [productId]);

  const submitReview = async () => {
    if (!user) return alert("Login required");
    if (!rating) return alert("Select rating");

    try {
      await api.post(
        "/reviews",
        { productId, rating, text },
        { headers: authHeader() }
      );
      setRating("");
      setText("");
      load();
    } catch (err) {
      alert("Failed to submit review");
    }
  };

  return (
    <div>
      <h3>Reviews</h3>

      {/* Add review */}
      {user ? (
        <div style={{ marginBottom: 20 }}>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            style={{ width: 100 }}
          >
            <option value="">Rating</option>
            <option value="1">1 ★</option>
            <option value="2">2 ★</option>
            <option value="3">3 ★</option>
            <option value="4">4 ★</option>
            <option value="5">5 ★</option>
          </select>

          <textarea
            placeholder="Write a review..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <button onClick={submitReview}>Submit Review</button>
        </div>
      ) : (
        <p style={{ opacity: 0.7 }}>Login to leave a review</p>
      )}

      {/* Review List */}
      {reviews.length === 0 && <p>No reviews yet.</p>}

      {reviews.map((r) => (
        <div
          key={r.id}
          style={{
            border: "1px solid #ddd",
            padding: 12,
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          <strong>{r.user?.name || "User"}</strong> — {r.rating} ★
          <p>{r.text}</p>
        </div>
      ))}
    </div>
  );
}
