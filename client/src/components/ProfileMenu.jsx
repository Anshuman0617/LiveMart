// client/src/components/ProfileMenu.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, authHeader } from '../api';
import ProfileSettings from './ProfileSettings';

export default function ProfileMenu({ user, onUserUpdate }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Check if user is a new retailer/wholesaler who needs to set phone and address
  const isNewSeller = () => {
    if (!user) return false;
    const isSeller = user.role === 'retailer' || user.role === 'wholesaler';
    if (!isSeller) return false;
    
    // Check if phone or address is missing
    const missingPhone = !user.phone || user.phone.trim() === '';
    const missingAddress = !user.address || user.address.trim() === '';
    
    return missingPhone || missingAddress;
  };

  // Auto-open settings for new retailers/wholesalers
  useEffect(() => {
    if (user && isNewSeller() && !showSettings) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        setShowSettings(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, showSettings]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleLogout = () => {
    // Clear user-specific cart data
    const userId = user?.id;
    if (userId) {
      localStorage.removeItem(`cart_${userId}`);
      localStorage.removeItem(`wholesaleCart_${userId}`);
    }
    localStorage.removeItem('cart');
    localStorage.removeItem('wholesaleCart');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('userLogout'));
    
    // Redirect to login page and replace history to prevent going back
    navigate('/login', { replace: true });
    
    // Clear browser history to prevent back navigation
    // This ensures users can't go back to authenticated pages after logout
    window.history.pushState(null, '', '/login');
  };

  const handleSettingsSaved = (updatedUser) => {
    onUserUpdate(updatedUser);
    
    // Check if updated user still needs to set phone/address
    const isSeller = updatedUser.role === 'retailer' || updatedUser.role === 'wholesaler';
    const missingPhone = !updatedUser.phone || updatedUser.phone.trim() === '';
    const missingAddress = !updatedUser.address || updatedUser.address.trim() === '';
    const stillNeedsInfo = isSeller && (missingPhone || missingAddress);
    
    // Only close if user has completed required fields
    if (!stillNeedsInfo) {
      setShowSettings(false);
      setShowMenu(false);
    } else {
      // Still missing required fields, keep settings open
      // User will need to save again with complete information
    }
  };

  return (
    <>
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            background: '#3399cc',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#2a7ba0'}
          onMouseLeave={(e) => e.target.style.background = '#3399cc'}
        >
          {user.name || user.email}
          <span style={{ fontSize: '12px' }}>▼</span>
        </button>

        {showMenu && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: '200px',
              zIndex: 1000,
              border: '1px solid #e0e0e0'
            }}
          >
            <button
              onClick={() => {
                setShowSettings(true);
                setShowMenu(false);
              }}
              style={{
                color: 'black',
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                borderBottom: '1px solid #f0f0f0'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              ⚙️ Settings
            </button>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#d32f2f'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              🚪 Logout
            </button>
          </div>
        )}
      </div>

      {showSettings && (
        <ProfileSettings
          user={user}
          onClose={() => {
            // Prevent closing if user is a new seller without phone/address
            if (isNewSeller()) {
              alert('Please set your phone number and address before closing. These are required for retailers and wholesalers.');
              return;
            }
            setShowSettings(false);
          }}
          onSave={handleSettingsSaved}
          forceOpen={isNewSeller()}
        />
      )}
    </>
  );
}

