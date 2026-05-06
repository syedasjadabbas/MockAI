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

export const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem('mockai_admin_token');

  // Auto-logout if token is expired before making any request
  if (token && isTokenExpired(token)) {
    forceLogout();
    throw new Error('Session expired. Please log in again.');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

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
  return response.json();
};
