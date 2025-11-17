// client/src/components/ProfileMenu.jsx
import React, { useState, useEffect, useRef } from 'react';
import { api, authHeader } from '../api';
import ProfileSettings from './ProfileSettings';

export default function ProfileMenu({ user, onUserUpdate }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const menuRef = useRef(null);

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
    window.location.reload();
  };

  const handleSettingsSaved = (updatedUser) => {
    onUserUpdate(updatedUser);
    setShowSettings(false);
    setShowMenu(false);
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
          onClose={() => setShowSettings(false)}
          onSave={handleSettingsSaved}
        />
      )}
    </>
  );
}

