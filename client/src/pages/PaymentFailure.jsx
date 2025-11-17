// client/src/pages/PaymentFailure.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function PaymentFailure() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Get error details from URL params (PayU sends these on failure)
    const error = searchParams.get("error");
    const errorMessage = searchParams.get("error_Message");
    const txnid = searchParams.get("txnid");
    const status = searchParams.get("status");

    // Build error message from available parameters
    let message = "Your payment could not be processed.";
    
    if (errorMessage) {
      message = errorMessage;
    } else if (error) {
      message = `Payment error: ${error}`;
    } else if (status) {
      message = `Payment status: ${status}`;
    }

    setErrorMessage(message);

    // Clear pending order from sessionStorage
    sessionStorage.removeItem("pendingOrder");

    // Note: We don't clear the cart on failure so user can try again
  }, [searchParams]);

  const handleTryAgain = () => {
    // Navigate to appropriate cart based on user role
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.role === 'retailer') {
      navigate("/wholesale-cart");
    } else {
      navigate("/cart");
    }
  };

  return (
    <div className="App" style={{ padding: 40, textAlign: "center" }}>
      <div style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "40px",
        backgroundColor: "#fff",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
      }}>
        {/* Error Icon */}
        <div style={{
          fontSize: "64px",
          marginBottom: "20px"
        }}>
          ❌
        </div>

        <h2 style={{ 
          color: "#dc2626", 
          marginBottom: "16px",
          fontSize: "28px"
        }}>
          Payment Failed
        </h2>

        <p style={{
          fontSize: "16px",
          color: "#666",
          marginBottom: "8px",
          lineHeight: "1.6"
        }}>
          {errorMessage || "Your payment could not be processed. Please try again."}
        </p>

        <p style={{
          fontSize: "14px",
          color: "#999",
          marginTop: "20px",
          marginBottom: "30px"
        }}>
          Don't worry, your items are still in your cart. You can try again or contact support if the problem persists.
        </p>

        <div style={{ 
          display: "flex", 
          gap: "12px", 
          justifyContent: "center",
          flexWrap: "wrap"
        }}>
          <button
            onClick={handleTryAgain}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              background: "#3399cc",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => e.target.style.background = "#2a7ba0"}
            onMouseLeave={(e) => e.target.style.background = "#3399cc"}
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
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => e.target.style.background = "#4b5563"}
            onMouseLeave={(e) => e.target.style.background = "#6b7280"}
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}

