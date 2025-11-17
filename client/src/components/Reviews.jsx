// client/src/components/Reviews.jsx
import React, { useEffect, useState } from "react";
import { api, authHeader } from "../api";

export default function Reviews({ productId, allowReviewForm = true }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [reviews, setReviews] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [rating, setRating] = useState("");
  const [text, setText] = useState("");
  const [filterRating, setFilterRating] = useState(""); // Filter by star rating
  const [formInitialized, setFormInitialized] = useState(false); // Track if form has been initialized

  const load = async (starFilter = "") => {
    try {
      // Always load all reviews first for filter counts
      const allRes = await api.get(`/reviews/${productId}`);
      setAllReviews(allRes.data);
      
      // Then load filtered reviews if filter is active
      if (starFilter) {
        const params = { rating: starFilter };
        const filteredRes = await api.get(`/reviews/${productId}`, { params });
        setReviews(filteredRes.data);
      } else {
        setReviews(allRes.data);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    }
  };

  useEffect(() => {
    // Reset form initialization when product changes
    setFormInitialized(false);
    setRating("");
    setText("");
    load(filterRating);
  }, [productId, filterRating]);

  // Pre-populate form if user has existing review (only once when reviews are loaded)
  useEffect(() => {
    if (user && allReviews.length > 0 && !formInitialized) {
      const userReview = allReviews.find(r => r.userId === user.id);
      if (userReview) {
        setRating(userReview.rating.toString());
        setText(userReview.text || "");
        setFormInitialized(true);
      } else {
        // Clear form if user doesn't have a review
        setRating("");
        setText("");
        setFormInitialized(true);
      }
    } else if (!user) {
      // Clear form if user logs out
      setRating("");
      setText("");
      setFormInitialized(false);
    }
  }, [allReviews, user, formInitialized]);

  const submitReview = async () => {
    if (!user) return alert("Login required");
    if (!rating) return alert("Select rating");

    try {
      await api.post(
        "/reviews",
        { productId, rating, text },
        { headers: authHeader() }
      );
      // Reset form initialization flag so form can be re-populated with updated review
      setFormInitialized(false);
      // Reload reviews (form will be re-populated if user has review)
      load(filterRating);
      alert("Review submitted successfully!");
    } catch (err) {
      alert("Failed to submit review");
    }
  };

  // Count reviews by rating
  const getRatingCount = (starRating) => {
    return allReviews.filter(r => r.rating === starRating).length;
  };

  return (
    <div>
      <h3>Reviews</h3>

      {/* Add review - Only show for regular users */}
      {allowReviewForm && (
        <>
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
                style={{ width: "100%", minHeight: 80, marginTop: 10 }}
              />

              <button onClick={submitReview} style={{ marginTop: 10 }}>
                {allReviews.some(r => r.userId === user?.id) ? "Update Review" : "Submit Review"}
              </button>
            </div>
          ) : (
            <p style={{ opacity: 0.7 }}>Login to leave a review</p>
          )}
        </>
      )}

      {/* Filter by stars */}
      <div style={{ marginBottom: 20 }}>
        <p><strong>Filter by rating:</strong></p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => setFilterRating("")}
            style={{
              padding: "6px 12px",
              background: filterRating === "" ? "#3399cc" : "#f0f0f0",
              color: filterRating === "" ? "white" : "black",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            All ({allReviews.length})
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => setFilterRating(star.toString())}
              style={{
                padding: "6px 12px",
                background: filterRating === star.toString() ? "#3399cc" : "#f0f0f0",
                color: filterRating === star.toString() ? "white" : "black",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {star} ★ ({getRatingCount(star)})
            </button>
          ))}
        </div>
      </div>

      {/* Review List */}
      {reviews.length === 0 && (
        <p>{filterRating ? `No ${filterRating}-star reviews yet.` : "No reviews yet."}</p>
      )}

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
          {r.user?.id === user?.id && (
            <span style={{ marginLeft: 10, fontSize: "0.9em", color: "#666" }}>
              (Your review)
            </span>
          )}
          <p style={{ marginTop: 8 }}>{r.text || <em>No comment</em>}</p>
          <small style={{ color: "#666" }}>
            {new Date(r.createdAt).toLocaleDateString()}
            {r.updatedAt !== r.createdAt && " (updated)"}
          </small>
        </div>
      ))}
    </div>
  );
}
