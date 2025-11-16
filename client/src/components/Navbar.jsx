// client/src/components/Navbar.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const nav = useNavigate();

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setShowLogoutModal(false);
    nav('/');
    window.location.reload();
  }

  return (
    <nav className="navbar" style={{ marginBottom: 20 }}>
      <div
        className="navbar-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        {/* Brand */}
        <button className="navbar-brand" onClick={() => nav('/')}>
          LiveMart
        </button>

        {/* Links */}
        <div
          className="navbar-links"
          style={{ display: "flex", gap: 12, alignItems: "center" }}
        >
          <button className="nav-button" onClick={() => nav('/')}>
            Products
          </button>

          {/* Cart should ALWAYS be visible */}
          <button className="nav-button" onClick={() => nav('/cart')}>
            Cart
          </button>

          {user?.role === 'retailer' && (
            <button className="nav-button" onClick={() => nav('/retailer')}>
              Retailer Dashboard
            </button>
          )}

          {user?.role === 'wholesaler' && (
            <button className="nav-button" onClick={() => nav('/wholesaler')}>
              Wholesaler Dashboard
            </button>
          )}

          {user?.role === "retailer" && (
            <button
              className="nav-button"
              onClick={() => nav('/wholesale-products')}
            >
              Buy Wholesale
            </button>
          )}
        </div>

        {/* Auth */}
        <div
          className="navbar-auth"
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          {!user ? (
            <button
              className="nav-button nav-button-login"
              onClick={() => nav('/login')}
            >
              Login
            </button>
          ) : (
            <>
              <span className="nav-user-name" style={{ fontWeight: 600 }}>
                {user.name || user.email}
              </span>
              <button
                className="nav-button nav-button-logout"
                onClick={() => setShowLogoutModal(true)}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      {/* Logout modal */}
      {showLogoutModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowLogoutModal(false)}
          style={{
            position: "fixed",
            top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.4)",
            display: "flex", justifyContent: "center", alignItems: "center"
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 10,
              width: 320
            }}
          >
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div
              className="modal-actions"
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              <button onClick={() => setShowLogoutModal(false)} className="secondary">
                Cancel
              </button>
              <button onClick={logout} className="danger">
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
