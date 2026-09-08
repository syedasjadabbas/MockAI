const normalizeApiUrl = (url, fallback) => {
  if (!url || typeof url !== 'string' || !url.trim()) return fallback;
  let trimmed = url.trim().replace(/\/+$/, '');
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  // If provided as a bare Render service slug or hostname (e.g. 'mockai-backend-4gxp')
  if (!trimmed.includes('.')) {
    return `https://${trimmed}.onrender.com`;
  }
  return `https://${trimmed}`;
};

const rawApiBase = import.meta.env.VITE_API_BASE;
const rawApiUrl = import.meta.env.VITE_API_URL;

export const API_BASE = normalizeApiUrl(rawApiBase, 'http://127.0.0.1:8000');
const API_URL = rawApiUrl ? normalizeApiUrl(rawApiUrl, `${API_BASE}/admin`) : `${API_BASE}/admin`;


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
const DEFAULT_TTL_MS = 60000; // 60 seconds fresh cache
const STALE_TTL_MS = 10 * 60 * 1000; // 10 minutes stale retention for SWR

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
  window.dispatchEvent(new CustomEvent('apicache_invalidated', { detail: { endpointSubstring } }));
};

/**
 * Synchronously retrieves cached data for immediate component render (0ms initial render).
 */
export const getCachedData = (endpoint, method = 'GET') => {
  const cacheKey = `${method.toUpperCase()}:${endpoint}`;
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() < cached.staleAt) {
    return cached.data;
  }
  return null;
};

/**
 * Prefetches an endpoint into memory ahead of time (e.g. on sidebar tab hover).
 */
export const prefetch = (endpoint, options = {}) => {
  const cacheKey = `GET:${endpoint}`;
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return Promise.resolve(cached.data);
  }
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }
  return fetchWithAuth(endpoint, { ...options, isPrefetch: true }).catch(() => null);
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

  // Instant return from fresh cache for GET requests
  if (isGet && !skipCache) {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      const now = Date.now();
      // Fresh hit: return immediately
      if (now < cached.expiresAt) {
        return cached.data;
      }
      // Stale-while-revalidate hit: return stale data immediately, revalidate in background
      if (now < cached.staleAt && !inFlightRequests.has(cacheKey)) {
        // Trigger background fetch to freshen cache
        setTimeout(() => {
          fetchWithAuth(endpoint, { ...options, forceRefresh: true }).catch(() => {});
        }, 0);
        return cached.data;
      }
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
        const now = Date.now();
        apiCache.set(cacheKey, {
          data,
          expiresAt: now + ttl,
          staleAt: now + STALE_TTL_MS,
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

