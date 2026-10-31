import axios from 'axios';
import { handleDevMockRequest } from './devMock';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── Request interceptor: attach Bearer token or Dev Preview Adapter ───────────
api.interceptors.request.use(
  (config) => {
    // Development-only mock preview adapter (active only when explicitly toggled)
    if (import.meta.env.DEV && localStorage.getItem('bl_dev_preview') === 'true') {
      config.adapter = async (cfg) => {
        // Small realistic micro-latency for smooth UI transition
        await new Promise((r) => setTimeout(r, 60));
        const res = handleDevMockRequest(cfg);
        return {
          data: res.data,
          status: res.status,
          statusText: 'OK',
          headers: {},
          config: cfg,
          request: {},
        };
      };
      return config;
    }

    const access = localStorage.getItem('bl_access');
    if (access) {
      config.headers.Authorization = `Bearer ${access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: auto-refresh on 401 ────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refresh = localStorage.getItem('bl_refresh');

      if (!refresh) {
        // No refresh token — force logout
        localStorage.removeItem('bl_access');
        localStorage.removeItem('bl_refresh');
        window.dispatchEvent(new Event('bl:logout'));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post('/api/v1/auth/token/refresh/', {
          refresh,
        });
        const newAccess = data.access;
        localStorage.setItem('bl_access', newAccess);
        if (data.refresh) localStorage.setItem('bl_refresh', data.refresh);
        api.defaults.headers.Authorization = `Bearer ${newAccess}`;
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('bl_access');
        localStorage.removeItem('bl_refresh');
        window.dispatchEvent(new Event('bl:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
