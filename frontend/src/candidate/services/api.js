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

  const method = (options.method || 'GET').toUpperCase();
  const url = `${CANDIDATE_API_URL}${endpoint}`;
  const timeoutMs = options.timeout || 12000; // 12-second default timeout

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  console.log(`[CandidateAPI Request] ${method} ${url} (timeout: ${timeoutMs}ms)`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    const elapsed = Date.now() - startTime;
    console.log(`[CandidateAPI Response] ${response.status} ${method} ${url} (${elapsed}ms)`);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMsg = errorBody.detail || response.statusText || 'Request failed';
      console.error(`[CandidateAPI Error] ${response.status} ${url}:`, errorMsg);
      const error = new Error(errorMsg);
      error.status = response.status;
      throw error;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    if (err.name === 'AbortError') {
      const elapsed = Date.now() - startTime;
      console.error(`[CandidateAPI Timeout] ${method} ${url} timed out after ${elapsed}ms`);
      const timeoutError = new Error(`Request timed out after ${timeoutMs / 1000}s. Please check that the server is running.`);
      timeoutError.status = 408;
      throw timeoutError;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};
