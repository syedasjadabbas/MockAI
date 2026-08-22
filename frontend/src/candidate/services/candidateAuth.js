// Candidate authentication (FR01 Registration, FR02 Login, FR03 Password
// Recovery) - backed by the real FastAPI + MongoDB + bcrypt + JWT backend
// (backend/routes/candidate.py), replacing the earlier localStorage mock.
//
// Every exported function keeps the exact signature and return shape the
// mock version had, so every page that already imports from this module
// (Register.jsx, Login.jsx, Profile.jsx, CandidateHeader.jsx,
// CandidateSidebar.jsx, App.jsx's isCandidateAuthenticated) continues to
// work completely unchanged. All HTTP calls go through
// services/api.js - nothing here calls `fetch` directly.

import { fetchCandidateApi } from './api';

const TOKEN_KEY = 'mockai_candidate_token';
const SESSION_KEY = 'mockai_candidate_session';

// The JWT the backend issues is base64url-encoded per RFC 7519 (using `-`/`_`
// instead of `+`/`/`, typically without padding). Plain atob() only
// understands standard base64 and can throw or silently misdecode on a real
// token, so both isTokenExpired() and getSession() decode through this.
function decodeJwtPayload(token) {
  const [, payloadB64] = token.split('.');
  if (!payloadB64) throw new Error('Malformed token');
  const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return JSON.parse(atob(padded));
}

export function isTokenExpired(token) {
  try {
    const payload = decodeJwtPayload(token);
    return payload.exp && Date.now() / 1000 > payload.exp;
  } catch {
    return true;
  }
}

function persistSession(accessToken, meResponse) {
  const session = {
    id: meResponse.id,
    name: meResponse.name,
    email: meResponse.email,
    role: meResponse.role,
    createdAt: meResponse.created_at,
  };
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function register({ name, email, password }) {
  // The frontend form already validates password === confirmPassword before
  // calling this; confirm_password is sent as the same validated value so
  // the backend's own defensive check (for any direct API caller bypassing
  // the form) trivially agrees.
  const { access_token } = await fetchCandidateApi('/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, confirm_password: password }),
  });
  localStorage.setItem(TOKEN_KEY, access_token);
  const me = await fetchCandidateApi('/me');
  return persistSession(access_token, me);
}

export async function login({ email, password }) {
  const { access_token } = await fetchCandidateApi('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem(TOKEN_KEY, access_token);
  const me = await fetchCandidateApi('/me');
  return persistSession(access_token, me);
}

export async function requestPasswordReset(email) {
  if (!email?.trim()) throw new Error('Please enter your email address.');
  // Backend always returns the same generic message whether or not the
  // account exists, and only actually changes the password if it could
  // send the reset email - see backend/routes/candidate.py.
  return fetchCandidateApi('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// Stateless JWT, no server-side session to destroy - see backend/routes/
// candidate.py's comment on why there is deliberately no logout endpoint.
// Logging out is entirely this: stop presenting the token.
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function getSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || isTokenExpired(token)) return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!getSession();
}

// MOCK for this phase only: updates the locally-cached session so the
// Profile page's edit-name control keeps working end-to-end, but does not
// persist to the backend. A real PATCH /candidate/me arrives in the
// upcoming profile-integration phase - out of scope for this
// authentication-only pass. A page refresh (or next login's fresh /me
// fetch) will revert to the server's stored name until that lands.
export async function updateProfile(updates) {
  const session = getSession();
  if (!session) throw new Error('Not authenticated.');

  const updatedSession = { ...session, ...updates };
  localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
  return updatedSession;
}
