// client/src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const nav = useNavigate();
  const location = useLocation();

  // Update user state when location changes (e.g., after login)
  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    console.log('Navbar: User updated from location change:', currentUser);
    setUser(currentUser);
  }, [location]);

  // Listen for custom login event and storage changes
  useEffect(() => {
    const handleUserChange = () => {
      const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
      console.log('Navbar: User updated from event:', currentUser);
      setUser(currentUser);
    };

    // Listen for storage events (cross-tab)
    window.addEventListener('storage', handleUserChange);
    
    // Listen for custom login event
    window.addEventListener('userLogin', handleUserChange);
    window.addEventListener('userLogout', handleUserChange);

    return () => {
      window.removeEventListener('storage', handleUserChange);
      window.removeEventListener('userLogin', handleUserChange);
      window.removeEventListener('userLogout', handleUserChange);
    };
  }, []);

  function logout() {
    // Clear user-specific cart data
    const userId = user?.id;
    if (userId) {
      localStorage.removeItem(`cart_${userId}`);
      localStorage.removeItem(`wholesaleCart_${userId}`);
    }
    // Clear generic cart (for backward compatibility)
    localStorage.removeItem('cart');
    localStorage.removeItem('wholesaleCart');
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Dispatch event to update Navbar
    window.dispatchEvent(new Event('userLogout'));
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
        <button 
          className="navbar-brand" 
          onClick={() => {
            // For retailers, go to retailer dashboard; otherwise go to products
            if (user?.role == 'retailer') {
              nav('/retailer');
            }else if (user?.role == 'wholesaler') {
              nav('/wholesaler');
            } else {
              nav('/');
            }
          }}
        >
          LiveMart
        </button>

        {/* Links */}
        <div
          className="navbar-links"
          style={{ display: "flex", gap: 12, alignItems: "center" }}
        >
          {/* Products - Hidden for retailers */}
          {user?.role !== 'retailer' && user?.role !== 'wholesaler' && (
            <button className="nav-button" onClick={() => nav('/')}>
              Products
            </button>
          )}

          {/* Cart - Hidden for retailers */}
          {user?.role !== 'retailer' && user?.role !== 'wholesaler' && (
            <button className="nav-button" onClick={() => nav('/cart')}>
              Cart
            </button>
          )}

          {/* Wholesale Cart for Retailers */}
          {user?.role == 'retailer' && (
            <button className="nav-button" onClick={() => nav('/wholesale-cart')}>
              Wholesale Cart
            </button>
          )}

          {user?.role == 'retailer' && (
            <button className="nav-button" onClick={() => nav('/retailer')}>
              Retailer Dashboard
            </button>
          )}

          {user?.role == 'wholesaler' && (
            <button className="nav-button" onClick={() => nav('/wholesaler')}>
              Wholesaler Dashboard
            </button>
          )}

          {user?.role == "retailer" && (
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
