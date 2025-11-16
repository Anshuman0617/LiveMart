// client/src/components/GoogleLoginButton.jsx
import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';

export default function GoogleLoginButton({ onSuccess }) {
  const btnRef = useRef(null);
  const navigate = useNavigate();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clientId) {
      setError('Google Client ID not configured');
      console.error('VITE_GOOGLE_CLIENT_ID is not set in environment variables');
      return;
    }

    // Wait for Google script to load with timeout
    let retryCount = 0;
    const maxRetries = 50; // 5 seconds max wait time
    
    const initGoogleSignIn = () => {
      const googleObj = window.google?.accounts?.id;
      if (!googleObj) {
        retryCount++;
        if (retryCount >= maxRetries) {
          setError('Google Sign-In script failed to load. Please refresh the page.');
          console.error('Google Sign-In script not available after', maxRetries * 100, 'ms');
          return;
        }
        // Retry after a short delay if script not loaded yet
        setTimeout(initGoogleSignIn, 100);
        return;
      }

      try {
        googleObj.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              const res = await api.post('/auth/google', { idToken: response.credential });
              localStorage.setItem('token', res.data.token);
              localStorage.setItem('user', JSON.stringify(res.data.user));
              // Dispatch event to update Navbar
              window.dispatchEvent(new Event('userLogin'));

              // For retailers, reload to ensure Navbar updates properly
              if (res.data.user.role === 'retailer') {
                window.location.href = '/retailer';
              } else if (onSuccess) {
                onSuccess(res.data.user);
              } else {
                // Default behavior: navigate to home
                navigate('/');
              }
            } catch (err) {
              console.error('Google sign-in error:', err);
              const errorMsg = err.response?.data?.error || 'Google sign-in failed';
              alert(errorMsg);
            }
          },
        });

        if (btnRef.current) {
          googleObj.renderButton(btnRef.current, {
            theme: 'outline',
            size: 'large',
            width: 280
          });
        }
      } catch (err) {
        console.error('Error initializing Google Sign-In:', err);
        setError('Failed to initialize Google Sign-In');
      }
    };

    // Start initialization
    initGoogleSignIn();
  }, [clientId, onSuccess, navigate]);

  if (error) {
    return <div style={{ color: 'red' }}>{error}</div>;
  }

  return <div ref={btnRef}></div>;
}
