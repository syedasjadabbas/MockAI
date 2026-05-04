const API_URL = 'http://localhost:8000/api/admin';

export const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem('mockai_admin_token');
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
    localStorage.removeItem('mockai_admin_auth');
    localStorage.removeItem('mockai_admin_token');
    window.location.href = '/admin/login';
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'API Request Failed');
  }
  return response.json();
};
