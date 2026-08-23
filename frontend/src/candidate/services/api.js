// Centralized HTTP client for the Candidate Panel's real backend calls.
//
// Mirrors the existing Admin Panel's src/api.js fetchWithAuth pattern (same
// shape: Bearer token from localStorage, JSON in/out, thrown Error with the
// backend's `detail` message on failure) so the two stay consistent, without
// sharing state - a candidate token can never be sent to an admin route or
// vice versa because each lives under its own localStorage key and its own
// base URL.
//
// This is the ONLY place that should ever call `fetch` for candidate
// endpoints - candidateAuth.js and (in later phases) candidateApi.js build
// on top of this rather than making requests directly, per the "centralize
// API communication" requirement.
import { API_BASE } from '../../api';

const CANDIDATE_API_URL = import.meta.env.VITE_CANDIDATE_API_URL || `${API_BASE}/candidate`;
const TOKEN_KEY = 'mockai_candidate_token';

export const fetchCandidateApi = async (endpoint, options = {}) => {
  const token = localStorage.getItem(TOKEN_KEY);

  // FormData (used for media uploads) must NOT get a manual Content-Type -
  // the browser sets its own multipart boundary. JSON requests are
  // unaffected; this only changes behavior when options.body is FormData.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${CANDIDATE_API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error(errorBody.detail || 'Request failed');
    error.status = response.status;
    throw error;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};
