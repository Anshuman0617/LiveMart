// client/src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProfileMenu from './ProfileMenu';

export default function Navbar() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
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

          {(user?.role == "retailer" || user?.role == "wholesaler") && (
            <button
              className="nav-button"
              onClick={() => nav('/orders')}
            >
              Manage Orders
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
            <ProfileMenu
              user={user}
              onUserUpdate={(updatedUser) => {
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
              }}
            />
          )}
        </div>
      </div>

    </nav>
  );
}
