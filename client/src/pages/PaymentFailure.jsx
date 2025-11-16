// client/src/pages/PaymentFailure.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function PaymentFailure() {
  const navigate = useNavigate();

  return (
    <div className="App" style={{ padding: 40, textAlign: "center" }}>
      <h2 style={{ color: "#dc2626" }}>Payment Failed</h2>
      <p>Your payment could not be processed. Please try again.</p>
      <div style={{ marginTop: 20 }}>
        <button
          onClick={() => navigate("/cart")}
          style={{
            marginRight: 10,
            padding: "12px 24px",
            fontSize: "16px",
            background: "#3399cc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            background: "#6b7280",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}

