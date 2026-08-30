import axios from 'axios';
import { useAdminStore } from '@/stores/admin.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

/** Axios instance for the platform admin API — carries the admin token only. */
export const adminApi = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  // Opening a customer workspace returns a CRM refresh cookie; without this the
  // browser discards it and the workspace dies on the first reload.
  withCredentials: true,
});

adminApi.interceptors.request.use((config) => {
  const token = useAdminStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Fastify rejects an empty body sent with a JSON content-type.
  if (config.data === undefined || config.data === null) {
    delete config.headers['Content-Type'];
  }

  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Admin tokens are not refreshable; an expired session means signing in again.
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      useAdminStore.getState().logout();
      if (!window.location.pathname.startsWith('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  },
);

export const adminAuthApi = {
  login: async (email: string, password: string) => {
    const { data } = await adminApi.post('/admin/auth/login', { email, password });
    return data.data;
  },
  me: async () => {
    const { data } = await adminApi.get('/admin/auth/me');
    return data.data;
  },
};

export const adminTenantsApi = {
  stats: async () => {
    const { data } = await adminApi.get('/admin/tenants/stats');
    return data.data;
  },
  list: async (params?: Record<string, any>) => {
    const query = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    const { data } = await adminApi.get(`/admin/tenants?${query}`);
    return data;
  },
  get: async (id: string) => {
    const { data } = await adminApi.get(`/admin/tenants/${id}`);
    return data.data;
  },
  create: async (dto: any) => {
    const { data } = await adminApi.post('/admin/tenants', dto);
    return data.data;
  },
  update: async (id: string, dto: any) => {
    const { data } = await adminApi.patch(`/admin/tenants/${id}`, dto);
    return data.data;
  },
  remove: async (id: string) => {
    const { data } = await adminApi.delete(`/admin/tenants/${id}`);
    return data;
  },
  addUser: async (id: string, dto: any) => {
    const { data } = await adminApi.post(`/admin/tenants/${id}/users`, dto);
    return data.data;
  },
  removeUser: async (id: string, userId: string) => {
    const { data } = await adminApi.delete(`/admin/tenants/${id}/users/${userId}`);
    return data;
  },
  access: async (id: string) => {
    const { data } = await adminApi.post(`/admin/tenants/${id}/access`);
    return data.data;
  },
  upsertSubscription: async (id: string, dto: any) => {
    const { data } = await adminApi.post(`/admin/tenants/${id}/subscription`, dto);
    return data.data;
  },
  cancelSubscription: async (id: string) => {
    const { data } = await adminApi.post(`/admin/tenants/${id}/subscription/cancel`);
    return data.data;
  },
  setFeature: async (id: string, feature: string, dto: { enabled: boolean; config?: any }) => {
    const { data } = await adminApi.patch(`/admin/tenants/${id}/features/${feature}`, dto);
    return data.data;
  },
  addDomain: async (id: string, dto: { domain: string; isPrimary?: boolean }) => {
    const { data } = await adminApi.post(`/admin/tenants/${id}/domains`, dto);
    return data.data;
  },
  updateDomain: async (id: string, domainId: string, dto: { isPrimary?: boolean; verified?: boolean }) => {
    const { data } = await adminApi.patch(`/admin/tenants/${id}/domains/${domainId}`, dto);
    return data.data;
  },
  removeDomain: async (id: string, domainId: string) => {
    const { data } = await adminApi.delete(`/admin/tenants/${id}/domains/${domainId}`);
    return data;
  },
};

export const adminPlansApi = {
  list: async () => {
    const { data } = await adminApi.get('/admin/plans');
    return data.data;
  },
  create: async (dto: any) => {
    const { data } = await adminApi.post('/admin/plans', dto);
    return data.data;
  },
  update: async (id: string, dto: any) => {
    const { data } = await adminApi.patch(`/admin/plans/${id}`, dto);
    return data.data;
  },
  remove: async (id: string) => {
    const { data } = await adminApi.delete(`/admin/plans/${id}`);
    return data;
  },
};

export default adminApi;
