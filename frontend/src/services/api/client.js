/* ============================================================
   FraudGuard AI — REST API Client
   Base HTTP client targeting external FastAPI / REST backend
   URL: VITE_API_URL or http://localhost:8000/api/v1
============================================================ */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('fraudguard_token');

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout before mock fallback

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        // A 401 on a protected route means the session expired or was revoked
        // server-side. Signal the auth layer so it can drop the session and
        // bounce the user to /login instead of silently serving stale UI.
        if (response.status === 401 && !endpoint.startsWith('/auth')) {
          window.dispatchEvent(new CustomEvent('fraudguard:unauthorized'));
        }
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
        error.status = response.status; // callers use this to distinguish auth failures
        throw error;
      }

      return await response.json();
    } catch (error) {
      // In development or when external backend is not running, log and let caller use client mock fallback
      // console.warn(`[FraudGuard API] Notice for ${endpoint}:`, error.message);
      throw error;
    }
  }

  async get(endpoint, params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    const path = query ? `${endpoint}?${query}` : endpoint;
    return this.request(path, { method: 'GET' });
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) });
  }

  async patch(endpoint, data = {}) {
    return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
