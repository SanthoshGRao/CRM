import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export const API_BASE_URL = `${API_URL}/api/v1`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ── Request interceptor: attach access token ──────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Fastify rejects an empty body sent with a JSON content-type ("Body cannot be
  // empty when content-type is set to 'application/json'"), which breaks bodyless
  // DELETE requests. Drop the header when there is nothing to send.
  if (config.data === undefined || config.data === null) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// ── Token refresh ─────────────────────────────────────────────

/**
 * Endpoints that establish or tear down a session. A 401 from these is the
 * answer, not a stale-token symptom, so they must never trigger a refresh.
 */
const NO_REFRESH_PATHS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
];

/** In-flight refresh, so parallel 401s redeem the rotating cookie only once. */
let refreshPromise: Promise<string> | null = null;

/**
 * Exchanges the HttpOnly refresh cookie for a new access token.
 *
 * The access token is deliberately kept in memory only, so this is also what
 * restores a session after a page reload — see AuthGuard.
 */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((response) => {
        const token = response.data?.data?.accessToken;
        if (typeof token !== 'string' || !token) {
          throw new Error('Refresh response did not contain an access token');
        }
        useAuthStore.getState().setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

/** True when a request failed before the server ever answered. */
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

function redirectToLogin() {
  useAuthStore.getState().logout();

  if (typeof window === 'undefined') return;

  const { pathname, search } = window.location;
  // The admin console has its own session and its own login page.
  if (pathname.startsWith('/login') || pathname.startsWith('/admin')) return;

  const next = encodeURIComponent(`${pathname}${search}`);
  window.location.href = `/login?next=${next}`;
}

// ── Response interceptor: handle 401, refresh token ──────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // No response means the API was unreachable (server restarting, offline,
    // CORS rejection). Dropping the session over that would sign people out for
    // a blip they can recover from, so leave it alone.
    if (!originalRequest || !error.response) {
      return Promise.reject(error);
    }

    const url = originalRequest.url ?? '';
    const skipRefresh = NO_REFRESH_PATHS.some((path) => url.startsWith(path));

    if (error.response.status !== 401 || originalRequest._retry || skipRefresh) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const token = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return await api(originalRequest);
    } catch (refreshError) {
      if (isNetworkError(refreshError)) {
        // Same reasoning as above: the refresh never reached the server.
        return Promise.reject(error);
      }
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  },
);

export default api;
