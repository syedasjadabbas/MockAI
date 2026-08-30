// Candidate authentication (FR01 Registration, FR02 Login, FR03 Password
// Recovery) - backed by the real FastAPI + MongoDB + bcrypt + JWT backend
// (backend/routes/candidate.py), replacing the earlier localStorage mock.
//
// Every exported function keeps the exact signature and return shape the
// mock version had, so every page that already imports from this module
// (Register.jsx, Login.jsx, Profile.jsx, CandidateNav.jsx, App.jsx's
// isCandidateAuthenticated) continues to work completely unchanged. All
// HTTP calls go through services/api.js - nothing here calls `fetch`
// directly.

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
    avatar: meResponse.avatar,
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
// touching the token - used after a profile fetch/update so CandidateNav
// (which reads the cached session synchronously) reflects changes
// immediately, without a reload.
function cacheSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function initiateRegistration({ name, email, password, confirmPassword }) {
  if (!name?.trim()) throw new Error('Please enter your full name.');
  if (!email?.trim()) throw new Error('Please enter your email address.');
  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters.');
  if (password !== confirmPassword) throw new Error('Passwords do not match.');

  return fetchCandidateApi('/register/send-otp', {
    method: 'POST',
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim(),
      password,
      confirm_password: confirmPassword,
    }),
  });
}

export async function register(params) {
  return initiateRegistration({
    ...params,
    confirmPassword: params.confirmPassword || params.password,
  });
}

export async function verifyRegistrationOtp({ email, otp }) {
  if (!email?.trim()) throw new Error('Please enter your email address.');
  if (!otp?.trim() || otp.trim().length !== 6) throw new Error('Please enter a valid 6-digit verification code.');

  return fetchCandidateApi('/register/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
  });
}

export async function resendRegistrationOtp(email) {
  if (!email?.trim()) throw new Error('Please enter your email address.');
  return fetchCandidateApi('/register/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
  });
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

export async function sendPasswordResetOtp(email) {
  if (!email?.trim()) throw new Error('Please enter your email address.');
  return fetchCandidateApi('/forgot-password/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
  });
}

export async function requestPasswordReset(email) {
  return sendPasswordResetOtp(email);
}

export async function verifyPasswordResetOtp({ email, otp }) {
  if (!email?.trim()) throw new Error('Please enter your email address.');
  if (!otp?.trim() || otp.trim().length !== 6) throw new Error('Please enter a valid 6-digit verification code.');
  return fetchCandidateApi('/forgot-password/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
  });
}

export async function resetPasswordWithOtp({ email, resetToken, newPassword, confirmPassword }) {
  if (!email?.trim()) throw new Error('Please enter your email address.');
  if (!resetToken) throw new Error('Reset session expired. Please request a new code.');
  if (!newPassword || newPassword.length < 8) throw new Error('Password must be at least 8 characters.');
  if (newPassword !== confirmPassword) throw new Error('Passwords do not match.');

  return fetchCandidateApi('/forgot-password/reset', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim(),
      reset_token: resetToken,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
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

// Real PATCH /candidate/me - updates name and/or avatar.
export async function updateProfile({ name, avatar }) {
  const me = await fetchCandidateApi('/me', {
    method: 'PATCH',
    body: JSON.stringify({ name, avatar }),
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
