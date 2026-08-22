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

function toSession(meResponse) {
  return {
    id: meResponse.id,
    name: meResponse.name,
    email: meResponse.email,
    role: meResponse.role,
    createdAt: meResponse.created_at,
  };
}

function persistSession(accessToken, meResponse) {
  const session = toSession(meResponse);
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

// Caches an already-authenticated response's session shape without
// touching the token - used after a profile fetch/update so
// CandidateHeader/CandidateSidebar (which read the cached session
// synchronously) reflect changes immediately, without a reload.
function cacheSession(session) {
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

// Fetches the candidate's real record from MongoDB (GET /candidate/me) and
// refreshes the cached session so it can never drift from the backend -
// e.g. if the name was changed from another tab/device. Profile.jsx calls
// this on mount instead of trusting the cached session alone.
export async function getProfile() {
  const me = await fetchCandidateApi('/me');
  return cacheSession(toSession(me));
}

// Real PATCH /candidate/me - the backend only ever accepts `name` today,
// matching the system's actual user data model (see backend/routes/
// candidate.py); anything else in `updates` is not sent.
export async function updateProfile({ name }) {
  const me = await fetchCandidateApi('/me', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
  return cacheSession(toSession(me));
}

// Real PUT /candidate/change-password. The backend does not invalidate the
// existing JWT (stateless, no session store - see the endpoint's own
// comment), so the caller (Profile.jsx) logs the candidate out immediately
// after success as a client-side best practice, not because the old token
// stops working.
export async function changePassword({ oldPassword, newPassword }) {
  return fetchCandidateApi('/change-password', {
    method: 'PUT',
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
}
