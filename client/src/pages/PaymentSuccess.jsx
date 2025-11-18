// client/src/pages/PaymentSuccess.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, authHeader } from "../api";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [message, setMessage] = useState("");
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const verifyPayment = async () => {
      if (hasVerifiedRef.current) return;
      hasVerifiedRef.current = true;

      await new Promise(r => setTimeout(r, 100));

      try {
        const txnid = searchParams.get("txnid");
        const amount = searchParams.get("amount");
        const productinfo = searchParams.get("productinfo");
        const firstname = searchParams.get("firstname");
        const email = searchParams.get("email");
        const status = searchParams.get("status");
        const hash = searchParams.get("hash");

        const pendingOrderStr = sessionStorage.getItem("pendingOrder");
        if (!pendingOrderStr) {
          setMessage("Order details not found. Please contact support.");
          setVerifying(false);
          return;
        }

        const pendingOrder = JSON.parse(pendingOrderStr);

        if (!pendingOrder.items || !pendingOrder.items.length) {
          setMessage("Order items not found. Please contact support.");
          setVerifying(false);
          return;
        }

        const verifyRes = await api.post(
          "/payments/verify-payment",
          {
            txnid: txnid || null,
            amount: amount || null,
            productinfo: productinfo || null,
            firstname: firstname || null,
            email: email || null,
            status: status || null,
            hash: hash || null,
            items: pendingOrder.items,
            address: pendingOrder.address || "",
          },
          { headers: authHeader() }
        );

        if (!verifyRes.data.success) {
          setMessage("Payment verification failed. Please contact support.");
          setVerifying(false);
          return;
        }

        // SUCCESS
        setMessage("Payment successful! Your order has been placed.");

        // REMOVE pendingOrder immediately
        sessionStorage.removeItem("pendingOrder");

        const user = JSON.parse(localStorage.getItem("user") || "null");
        const userId = user?.id;
        const isWholesale = pendingOrder.isWholesale || false;

        console.log("Clearing cart. wholesale:", isWholesale);

        // ---- UNIVERSAL CART LOADER (supports userId & non-userId carts) ----

        const loadCart = (userKey, defaultKey) => {
          if (userId && localStorage.getItem(userKey)) {
            return JSON.parse(localStorage.getItem(userKey));
          }
          if (localStorage.getItem(defaultKey)) {
            return JSON.parse(localStorage.getItem(defaultKey));
          }
          return [];
        };

        const saveCart = (userKey, defaultKey, updated) => {
          if (updated.length === 0) {
            localStorage.removeItem(userKey);
            localStorage.removeItem(defaultKey);
          } else {
            if (userId) localStorage.setItem(userKey, JSON.stringify(updated));
            else localStorage.setItem(defaultKey, JSON.stringify(updated));
          }
        };

        // ---- FIX: Support id OR productId ----

        const buildOrderQtyMap = items => {
          const map = new Map();
          items.forEach(item => {
            const key = item.productId || item.id; // FIXED
            const existing = map.get(key) || 0;
            map.set(key, existing + (item.quantity || 1));
          });
          return map;
        };

        const orderedQuantities = buildOrderQtyMap(pendingOrder.items);

        // ---- CLEAR CART (WORKS FOR BOTH WHOLESALE + NORMAL) ----

        const clearCartByType = (type, navigateTo) => {
          const userKey = userId ? `${type}_${userId}` : null;
          const defaultKey = type;

          const cart = loadCart(userKey, defaultKey);

          const updatedCart = cart
            .map(item => {
              const key = item.productId || item.id; // FIXED
              const orderedQty = orderedQuantities.get(key) || 0;

              if (orderedQty > 0) {
                const newQty = (item.quantity || 0) - orderedQty;
                return newQty > 0 ? { ...item, quantity: newQty } : null;
              }
              return item;
            })
            .filter(i => i !== null);

          saveCart(userKey, defaultKey, updatedCart);

          // redirect AFTER writes resolve
          setTimeout(() => {
            requestAnimationFrame(() => {
              if (isMounted) navigate(navigateTo);
            });
          }, 150);
        };

        if (isWholesale) {
          clearCartByType("wholesaleCart", "/retailer");
        } else {
          clearCartByType("cart", "/cart");
        }

        // Notify cart cleared
        window.dispatchEvent(
          new CustomEvent("cartCleared", {
            detail: { isWholesale, orderIds: verifyRes.data.orderIds },
          })
        );
      } catch (err) {
        const msg =
          err.response?.data?.error || err.message || "Payment verification failed";
        setMessage("Payment verification failed: " + msg);
      } finally {
        if (isMounted) setVerifying(false);
      }
    };

    verifyPayment();

    return () => {
      isMounted = false;
    };
  }, []);

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
