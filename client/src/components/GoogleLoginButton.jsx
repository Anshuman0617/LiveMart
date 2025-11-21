// client/src/components/GoogleLoginButton.jsx
import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';

export default function GoogleLoginButton({ onSuccess }) {
  const navigate = useNavigate();
  const hiddenButtonRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

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
              // Clear any registration flag (user is logging in via Google, not registering)
              localStorage.removeItem('justRegistered');
              // Dispatch event to update Navbar
              window.dispatchEvent(new Event('userLogin'));

              // Redirect based on role
              if (res.data.user.role == 'retailer') {
                window.location.href = '/retailer';
              } else if (res.data.user.role == 'wholesaler') {
                window.location.href = '/wholesaler';
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

        // Render a hidden button that we can trigger
        if (hiddenButtonRef.current) {
          googleObj.renderButton(hiddenButtonRef.current, {
            theme: 'outline',
            size: 'large',
            width: 1,
            text: 'signin_with',
            type: 'standard'
          });
        }

        setIsReady(true);
      } catch (err) {
        console.error('Error initializing Google Sign-In:', err);
        setError('Failed to initialize Google Sign-In');
      }
    };

    // Start initialization
    initGoogleSignIn();
  }, [clientId, onSuccess, navigate]);

  const handleGoogleSignIn = () => {
    if (!isReady) {
      alert('Google Sign-In is not ready yet. Please wait a moment.');
      return;
    }

    // Find the hidden Google button and click it
    const hiddenButton = hiddenButtonRef.current?.querySelector('div[role="button"]');
    if (hiddenButton) {
      hiddenButton.click();
    } else {
      // Fallback: try prompt method
      const googleObj = window.google?.accounts?.id;
      if (googleObj) {
        googleObj.prompt();
      } else {
        alert('Google Sign-In is not available. Please refresh the page.');
      }
    }
  };

  if (error) {
    return <div style={{ color: 'red' }}>{error}</div>;
  }

  return (
    <>
      {/* Hidden Google button */}
      <div 
        ref={hiddenButtonRef}
        style={{ 
          position: 'absolute', 
          opacity: 0, 
          pointerEvents: 'none',
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        }}
      ></div>
      
      {/* Custom styled button */}
      <button
        className="login-button login-button-google"
        onClick={handleGoogleSignIn}
        disabled={!isReady}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          style={{ marginRight: '8px' }}
        >
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.467-.806 5.964-2.184l-2.908-2.258c-.806.54-1.837.86-3.056.86-2.35 0-4.34-1.587-5.052-3.72H.957v2.332C2.438 15.983 5.482 18 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.944 10.698c-.18-.54-.282-1.117-.282-1.698s.102-1.158.282-1.698V4.97H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.03l2.987-2.332z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.97L3.944 7.3C4.656 5.163 6.646 3.58 9 3.58z"
          />
        </svg>
        Continue with Google
      </button>
    </>
  );
}
