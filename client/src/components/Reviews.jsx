// client/src/components/Reviews.jsx
import React, { useEffect, useState } from "react";
import { api, authHeader } from "../api";
import { useModal } from "../hooks/useModal";

export default function Reviews({ productId, allowReviewForm = true, productOwnerId = null }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [reviews, setReviews] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [rating, setRating] = useState("");
  const [text, setText] = useState("");
  const [filterRating, setFilterRating] = useState(""); // Filter by star rating
  const [formInitialized, setFormInitialized] = useState(false); // Track if form has been initialized
  const [editingResponse, setEditingResponse] = useState({}); // Track which review responses are being edited
  const { showModal, ModalComponent } = useModal();

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
    if (!user) {
      showModal("Please login to submit a review", "Login Required", "warning");
      return;
    }
    if (!rating) {
      showModal("Please select a rating", "Rating Required", "warning");
      return;
    }

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
      showModal("Review submitted successfully!", "Success", "success");
    } catch (err) {
      showModal("Failed to submit review. Please try again.", "Error", "error");
    }
  };

  const handleRetailerResponse = async (reviewId, response) => {
    if (!response.trim()) {
      showModal("Please enter a response", "Response Required", "warning");
      return;
    }

    try {
      await api.put(
        `/reviews/${reviewId}/respond`,
        { response },
        { headers: authHeader() }
      );
      load(filterRating);
      showModal("Response submitted successfully!", "Success", "success");
    } catch (err) {
      console.error("Failed to submit response:", err);
      showModal(err.response?.data?.error || "Failed to submit response", "Error", "error");
    }
  };

  // Count reviews by rating
  const getRatingCount = (starRating) => {
    return allReviews.filter(r => r.rating === starRating).length;
  };

  return (
    <div>
      <ModalComponent />
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
            {new Date(r.createdAt).toLocaleDateString('en-IN', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            })}
            {r.updatedAt !== r.createdAt && " (updated)"}
          </small>
          
          {/* Retailer Response */}
          {r.retailerResponse ? (
            <div style={{ 
              marginTop: '12px', 
              padding: '12px', 
              backgroundColor: '#f0fdf4', 
              borderRadius: '6px',
              borderLeft: '3px solid #10b981'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '13px', color: '#166534' }}>Retailer Response</strong>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>
                    {new Date(r.retailerResponseAt).toLocaleDateString('en-IN', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
                {productOwnerId && user?.role === 'retailer' && user?.id === productOwnerId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingResponse({ ...editingResponse, [r.id]: true });
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #3b82f6',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      color: '#1e40af',
                      fontWeight: 600
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>
              {editingResponse[r.id] ? (
                <EditRetailerResponseForm 
                  reviewId={r.id} 
                  currentResponse={r.retailerResponse}
                  onSave={(newResponse) => {
                    handleRetailerResponse(r.id, newResponse);
                    setEditingResponse({ ...editingResponse, [r.id]: false });
                  }}
                  onCancel={() => {
                    setEditingResponse({ ...editingResponse, [r.id]: false });
                  }}
                />
              ) : (
                <p style={{ margin: 0, fontSize: '14px', color: '#374151' }}>{r.retailerResponse}</p>
              )}
            </div>
          ) : (
            // Show answer form for retailers (if product owner)
            productOwnerId && user?.role === 'retailer' && user?.id === productOwnerId && (
              <RetailerResponseForm reviewId={r.id} onResponse={handleRetailerResponse} />
            )
          )}
        </div>
      ))}
    </div>
  );
}

// Retailer Response Form Component
function RetailerResponseForm({ reviewId, onResponse }) {
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    await onResponse(reviewId, response);
    setResponse("");
    setSubmitting(false);
  };

  return (
    <div style={{ 
      marginTop: '12px', 
      padding: '12px', 
      backgroundColor: '#eff6ff', 
      borderRadius: '6px',
      border: '1px solid #bfdbfe'
    }}>
      <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#1e40af' }}>
        Respond to this review:
      </p>
      <textarea
        placeholder="Type your response here..."
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        style={{ 
          width: "100%", 
          minHeight: 60, 
          padding: '8px',
          fontSize: '13px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontFamily: 'inherit',
          resize: 'vertical'
        }}
      />
      <button 
        onClick={handleSubmit}
        disabled={submitting || !response.trim()}
        style={{ 
          marginTop: '8px',
          padding: '8px 16px',
          backgroundColor: submitting || !response.trim() ? '#9ca3af' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: submitting || !response.trim() ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: 600
        }}
      >
        {submitting ? 'Submitting...' : 'Submit Response'}
      </button>
    </div>
  );
}

// Edit Retailer Response Form Component
function EditRetailerResponseForm({ reviewId, currentResponse, onSave, onCancel }) {
  const [response, setResponse] = useState(currentResponse);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!response.trim()) {
      // This will be handled by parent component's modal
      return;
    }
    setSubmitting(true);
    await onSave(response);
    setSubmitting(false);
  };

  return (
    <div>
      <ModalComponent />
      <textarea
        placeholder="Type your response here..."
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        style={{ 
          width: "100%", 
          minHeight: 60, 
          padding: '8px',
          fontSize: '13px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontFamily: 'inherit',
          resize: 'vertical',
          marginBottom: '8px'
        }}
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={handleSave}
          disabled={submitting || !response.trim()}
          style={{ 
            padding: '6px 12px',
            backgroundColor: submitting || !response.trim() ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: submitting || !response.trim() ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          {submitting ? 'Saving...' : 'Save'}
        </button>
        <button 
          onClick={onCancel}
          disabled={submitting}
          style={{ 
            padding: '6px 12px',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
