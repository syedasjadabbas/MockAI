import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { loginWithGoogle } from '../services/candidateAuth';

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function GoogleAuthButton({
  mode = 'login',
  label = 'Continue with Google',
  onError,
  onSuccess,
  disabled = false,
}) {
  const [loading, setLoading] = useState(false);
  const [rendered, setRendered] = useState(false);
  const googleBtnContainerRef = useRef(null);
  const inFlightRef = useRef(false);
  const onErrorRef = useRef(onError);
  const onSuccessRef = useRef(onSuccess);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // Keep callback refs synchronized
  useEffect(() => {
    onErrorRef.current = onError;
    onSuccessRef.current = onSuccess;
  }, [onError, onSuccess]);

  const handleCredentialResponse = async (response) => {
    console.log('[GoogleAuth Flow] Step 1: GIS callback triggered, response received:', {
      hasCredential: !!response?.credential,
      select_by: response?.select_by || 'unknown',
    });

    if (inFlightRef.current) {
      console.warn('[GoogleAuth Flow] Ignoring duplicate Google authentication in-flight request');
      return;
    }

    if (!response || !response.credential) {
      console.error('[GoogleAuth Flow Error] No credential token received from Google Identity Services:', response);
      if (onErrorRef.current) onErrorRef.current('No credential received from Google sign-in. Please try again.');
      return;
    }

    console.log(`[GoogleAuth Flow] Step 2: Google credential token received (token length: ${response.credential.length})`);

    try {
      inFlightRef.current = true;
      setLoading(true);
      if (onErrorRef.current) onErrorRef.current('');

      await loginWithGoogle(response.credential);

      console.log('[GoogleAuth Flow] Step 8b: Google auth completed successfully. Directing user...');
      if (onSuccessRef.current) {
        onSuccessRef.current();
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('[GoogleAuth Flow Error] Verification failed:', err);
      const userMessage = err?.message || 'Google authentication failed. Please check your connection and try again.';
      if (onErrorRef.current) onErrorRef.current(userMessage);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    let intervalId;

    const setupGoogleSignIn = () => {
      if (!GOOGLE_CLIENT_ID) return;

      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (googleBtnContainerRef.current) {
            const containerWidth = googleBtnContainerRef.current.offsetWidth || 360;
            googleBtnContainerRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
              type: 'standard',
              theme: isDark ? 'filled_black' : 'outline',
              size: 'large',
              text: mode === 'register' ? 'signup_with' : 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: Math.min(Math.max(containerWidth, 240), 400),
            });
            setRendered(true);
          }
        } catch (e) {
          console.warn('Google Identity Services notice:', e);
        }
      }
    };

    setupGoogleSignIn();

    if (!window.google?.accounts?.id) {
      intervalId = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(intervalId);
          setupGoogleSignIn();
        }
      }, 300);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [mode, isDark, GOOGLE_CLIENT_ID]);

  const handleCustomFallbackClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      if (onError) {
        onError('Google sign-in is not configured yet. Please set VITE_GOOGLE_CLIENT_ID in frontend/.env.');
      }
      return;
    }

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            const innerBtn = googleBtnContainerRef.current?.querySelector('div[role="button"]');
            if (innerBtn) innerBtn.click();
          }
        });
      } catch (err) {
        console.warn('Google prompt fallback notice:', err);
      }
    } else {
      if (onError) {
        onError('Google Identity Services is initializing. Please click again in a moment.');
      }
    }
  };

  return (
    <div className="w-full relative min-h-[44px]">
      {/* Official GIS Button Rendering Target */}
      <div
        ref={googleBtnContainerRef}
        className={`w-full flex justify-center items-center transition-opacity duration-200 ${rendered && !loading ? 'opacity-100' : 'hidden'}`}
        style={{ minHeight: '44px' }}
      />

      {/* Branded Fallback / Loading Presentation */}
      {(!rendered || loading) && (
        <button
          type="button"
          disabled={disabled || loading}
          onClick={handleCustomFallbackClick}
          className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-semibold border transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--c-input-bg)',
            borderColor: 'var(--c-input-border)',
            color: 'var(--c-text)',
          }}
        >
          {loading ? (
            <span className="w-4 h-4 mr-2.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
          ) : (
            <GoogleIcon />
          )}
          {loading ? 'Verifying with Google...' : label}
        </button>
      )}
    </div>
  );
}
