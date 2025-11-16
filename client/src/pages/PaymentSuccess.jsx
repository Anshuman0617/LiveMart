// client/src/pages/PaymentSuccess.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, authHeader } from "../api";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get payment details from URL params (PayU sends these)
        const txnid = searchParams.get("txnid");
        const amount = searchParams.get("amount");
        const productinfo = searchParams.get("productinfo");
        const firstname = searchParams.get("firstname");
        const email = searchParams.get("email");
        const status = searchParams.get("status");
        const hash = searchParams.get("hash");

        // Get stored order details
        const pendingOrderStr = sessionStorage.getItem("pendingOrder");
        if (!pendingOrderStr) {
          setMessage("Order details not found. Please contact support.");
          setVerifying(false);
          return;
        }

        const pendingOrder = JSON.parse(pendingOrderStr);

        // Verify payment with backend
        const verifyRes = await api.post(
          "/payments/verify-payment",
          {
            txnid,
            amount,
            productinfo,
            firstname,
            email,
            status,
            hash,
            items: pendingOrder.items,
            address: pendingOrder.address,
          },
          { headers: authHeader() }
        );

        if (verifyRes.data.success) {
          setMessage("Payment successful! Your order has been placed.");
          // Clear user-specific cart and pending order
          const user = JSON.parse(localStorage.getItem('user') || 'null');
          const userId = user?.id;
          const cartKey = userId ? `cart_${userId}` : 'cart';
          localStorage.removeItem(cartKey);
          sessionStorage.removeItem("pendingOrder");
          
          // Redirect to home after 3 seconds
          setTimeout(() => {
            navigate("/");
          }, 3000);
        } else {
          setMessage("Payment verification failed. Please contact support.");
        }
      } catch (err) {
        console.error("Payment verification error:", err);
        setMessage("Payment verification failed. Please contact support.");
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  return (
    <div className="App" style={{ padding: 40, textAlign: "center" }}>
      {verifying ? (
        <>
          <h2>Verifying Payment...</h2>
          <p>Please wait while we verify your payment.</p>
        </>
      ) : (
        <>
          <h2 style={{ color: "#22c55e" }}>Payment Successful!</h2>
          <p>{message}</p>
          <button
            onClick={() => navigate("/")}
            style={{
              marginTop: 20,
              padding: "12px 24px",
              fontSize: "16px",
              background: "#3399cc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Go to Home
          </button>
        </>
      )}
    </div>
  );
}

