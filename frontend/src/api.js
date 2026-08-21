const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/admin';
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp && Date.now() / 1000 > payload.exp;
  } catch {
    return true;
  }
};

const forceLogout = () => {
  localStorage.removeItem('mockai_admin_auth');
  localStorage.removeItem('mockai_admin_token');
  if (window.location.pathname !== '/admin/login') {
    window.location.href = '/admin/login';
  }
};

// In-memory cache store and in-flight promise registry
const apiCache = new Map();
const inFlightRequests = new Map();
const DEFAULT_TTL_MS = 20000; // 20 seconds cache for instant tab transitions

export const invalidateApiCache = (endpointSubstring = '') => {
  if (!endpointSubstring) {
    apiCache.clear();
  } else {
    for (const key of apiCache.keys()) {
      if (key.includes(endpointSubstring)) {
        apiCache.delete(key);
      }
    }
  }
};

export const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem('mockai_admin_token');

  // Auto-logout if token is expired before making any request
  if (token && isTokenExpired(token)) {
    forceLogout();
    throw new Error('Session expired. Please log in again.');
  }

  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const skipCache = options.skipCache || options.forceRefresh;

  // Invalidate cache on mutations (POST, PUT, PATCH, DELETE)
  if (!isGet) {
    invalidateApiCache();
  }

  const cacheKey = `${method}:${endpoint}`;

  // Check cache for GET requests
  if (isGet && !skipCache) {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return JSON.parse(JSON.stringify(cached.data));
    }
  }

  // Deduplicate in-flight GET requests
  if (isGet && inFlightRequests.has(cacheKey) && !skipCache) {
    return inFlightRequests.get(cacheKey);
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const fetchPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        forceLogout();
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'API Request Failed');
      }

      const data = await response.json();

      // Store in cache if GET request
      if (isGet) {
        const ttl = options.ttl || DEFAULT_TTL_MS;
        apiCache.set(cacheKey, {
          data,
          expiresAt: Date.now() + ttl,
        });
      }

      return data;
    } finally {
      if (isGet) {
        inFlightRequests.delete(cacheKey);
      }
    }
  })();

  if (isGet && !skipCache) {
    inFlightRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
};

