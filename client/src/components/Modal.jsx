// client/src/components/Modal.jsx
import React from 'react';

export default function Modal({ isOpen, onClose, title, message, type = 'info' }) {
  if (!isOpen) return null;

  // Color scheme based on type
  const colorSchemes = {
    info: {
      bg: '#eff6ff',
      border: '#3b82f6',
      text: '#1e40af',
      button: '#3b82f6'
    },
    success: {
      bg: '#f0fdf4',
      border: '#10b981',
      text: '#166534',
      button: '#10b981'
    },
    error: {
      bg: '#fef2f2',
      border: '#ef4444',
      text: '#991b1b',
      button: '#ef4444'
    },
    warning: {
      bg: '#fffbeb',
      border: '#f59e0b',
      text: '#92400e',
      button: '#f59e0b'
    }
  };

  const colors = colorSchemes[type] || colorSchemes.info;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          border: `2px solid ${colors.border}`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          {title && (
            <h3 style={{ 
              margin: 0, 
              fontSize: '20px', 
              fontWeight: 600,
              color: colors.text
            }}>
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Message */}
        <div style={{ 
          marginBottom: '20px',
          fontSize: '16px',
          color: '#374151',
          lineHeight: '1.5'
        }}>
          {message}
        </div>

        {/* Footer */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.button,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

