import api from './client';
import type { Deal, Lead, PaginatedResponse } from '@crm/types';

/** Anything omitted is carried over from the lead by the API. */
export interface ConvertLeadPayload {
  name?: string;
  pipelineId?: string;
  stageId?: string;
  ownerId?: string;
  value?: number;
  probability?: number;
  expectedCloseDate?: string;
}

/** Serialises params to a query string, dropping empty/undefined values. */
export function toQuery(params?: Record<string, any>): string {
  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k, String(v)]),
    ),
  ).toString();
}

export const leadsApi = {
  list: async (params?: Record<string, any>): Promise<PaginatedResponse<Lead> & { success: boolean }> => {
    const query = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== ''),
      ),
    ).toString();
    const { data } = await api.get(`/leads?${query}`);
    return data;
  },

  kanban: async (pipelineId: string) => {
    const { data } = await api.get(`/leads/kanban?pipelineId=${pipelineId}`);
    return data.data;
  },

  get: async (id: string) => {
    const { data } = await api.get(`/leads/${id}`);
    return data.data as Lead;
  },

  create: async (dto: Partial<Lead>) => {
    const { data } = await api.post('/leads', dto);
    return data.data as Lead;
  },

  update: async (id: string, dto: Partial<Lead>) => {
    const { data } = await api.patch(`/leads/${id}`, dto);
    return data.data as Lead;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/leads/${id}`);
    return data;
  },

  /** Converts a lead into an open deal and returns the new deal. */
  convert: async (id: string, dto: ConvertLeadPayload = {}) => {
    const { data } = await api.post(`/leads/${id}/convert`, dto);
    return data.data as Deal;
  },

  bulkUpdate: async (ids: string[], updates: Record<string, any>) => {
    const { data } = await api.patch('/leads/bulk/update', { ids, data: updates });
    return data;
  },
};

export const contactsApi = {
  list: async (params?: Record<string, any>) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== '')),
    ).toString();
    const { data } = await api.get(`/contacts?${query}`);
    return data;
  },
  get: async (id: string) => { const { data } = await api.get(`/contacts/${id}`); return data.data; },
  create: async (dto: any) => { const { data } = await api.post('/contacts', dto); return data.data; },
  update: async (id: string, dto: any) => { const { data } = await api.patch(`/contacts/${id}`, dto); return data.data; },
  delete: async (id: string) => { const { data } = await api.delete(`/contacts/${id}`); return data; },
};

export const companiesApi = {
  list: async (params?: Record<string, any>) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== '')),
    ).toString();
    const { data } = await api.get(`/companies?${query}`);
    return data;
  },
  get: async (id: string) => { const { data } = await api.get(`/companies/${id}`); return data.data; },
  create: async (dto: any) => { const { data } = await api.post('/companies', dto); return data.data; },
  update: async (id: string, dto: any) => { const { data } = await api.patch(`/companies/${id}`, dto); return data.data; },
  remove: async (id: string) => { const { data } = await api.delete(`/companies/${id}`); return data; },
};

export const dealsApi = {
  list: async (params?: Record<string, any>) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== '')),
    ).toString();
    const { data } = await api.get(`/deals?${query}`);
    return data;
  },
  get: async (id: string) => { const { data } = await api.get(`/deals/${id}`); return data.data; },
  create: async (dto: any) => { const { data } = await api.post('/deals', dto); return data.data; },
  update: async (id: string, dto: any) => { const { data } = await api.patch(`/deals/${id}`, dto); return data.data; },
  remove: async (id: string) => { const { data } = await api.delete(`/deals/${id}`); return data; },
};

export const tasksApi = {
  list: async (params?: Record<string, any>) => {
    const { data } = await api.get(`/tasks?${toQuery(params)}`);
    return data;
  },
  get: async (id: string) => { const { data } = await api.get(`/tasks/${id}`); return data.data; },
  create: async (dto: any) => { const { data } = await api.post('/tasks', dto); return data.data; },
  update: async (id: string, dto: any) => { const { data } = await api.patch(`/tasks/${id}`, dto); return data.data; },
  delete: async (id: string) => { const { data } = await api.delete(`/tasks/${id}`); return data; },
};

export const pipelinesApi = {
  list: async (entityType?: 'lead' | 'deal') => {
    const { data } = await api.get(`/pipelines?${toQuery({ entityType })}`);
    return data.data;
  },
  get: async (id: string) => { const { data } = await api.get(`/pipelines/${id}`); return data.data; },
};

export const activitiesApi = {
  list: async (params?: Record<string, any>) => {
    const { data } = await api.get(`/activities?${toQuery(params)}`);
    return data;
  },
  stats: async () => { const { data } = await api.get('/activities/stats'); return data.data; },
  create: async (dto: any) => { const { data } = await api.post('/activities', dto); return data.data; },
};

export const workflowsApi = {
  list: async (params?: Record<string, any>) => {
    const { data } = await api.get(`/workflows?${toQuery(params)}`);
    return data;
  },
  get: async (id: string) => { const { data } = await api.get(`/workflows/${id}`); return data.data; },
  create: async (dto: any) => { const { data } = await api.post('/workflows', dto); return data.data; },
  update: async (id: string, dto: any) => { const { data } = await api.patch(`/workflows/${id}`, dto); return data.data; },
  delete: async (id: string) => { const { data } = await api.delete(`/workflows/${id}`); return data; },
  /** Recent runs, newest first. */
  executions: async (id: string, limit = 20) => {
    const { data } = await api.get(`/workflows/${id}/executions?limit=${limit}`);
    return data.data as any[];
  },
  /** Dry run against a real record — reports what would happen, changes nothing. */
  simulate: async (id: string, recordId?: string) => {
    const { data } = await api.post(`/workflows/${id}/simulate`, { recordId });
    return data.data;
  },
};

export const usersApi = {
  list: async (params?: Record<string, any>) => {
    const { data } = await api.get(`/users?${toQuery(params)}`);
    return data;
  },
  get: async (id: string) => { const { data } = await api.get(`/users/${id}`); return data.data; },
  roles: async () => { const { data } = await api.get('/users/roles'); return data.data; },
  create: async (dto: any) => { const { data } = await api.post('/users', dto); return data.data; },
  update: async (id: string, dto: any) => { const { data } = await api.patch(`/users/${id}`, dto); return data.data; },
  remove: async (id: string) => { const { data } = await api.delete(`/users/${id}`); return data; },
};

export const rolesApi = {
  list: async () => { const { data } = await api.get('/roles'); return data.data; },
  get: async (id: string) => { const { data } = await api.get(`/roles/${id}`); return data.data; },
  catalogue: async () => { const { data } = await api.get('/roles/catalogue'); return data.data; },
};

export const apiKeysApi = {
  list: async () => { const { data } = await api.get('/api-keys'); return data.data; },
  create: async (dto: any) => { const { data } = await api.post('/api-keys', dto); return data.data; },
  revoke: async (id: string) => { const { data } = await api.post(`/api-keys/${id}/revoke`); return data.data; },
  remove: async (id: string) => { const { data } = await api.delete(`/api-keys/${id}`); return data; },
};

export const customFieldsApi = {
  list: async (params?: Record<string, any>) => {
    const { data } = await api.get(`/custom-fields?${toQuery(params)}`);
    return data.data;
  },
  create: async (dto: any) => { const { data } = await api.post('/custom-fields', dto); return data.data; },
  update: async (id: string, dto: any) => { const { data } = await api.patch(`/custom-fields/${id}`, dto); return data.data; },
  remove: async (id: string) => { const { data } = await api.delete(`/custom-fields/${id}`); return data; },
  getValues: async (entityType: string, recordId: string) => {
    const { data } = await api.get(`/custom-fields/values/${entityType}/${recordId}`);
    return data.data;
  },
  setValues: async (entityType: string, recordId: string, values: Record<string, string | null>) => {
    const { data } = await api.put(`/custom-fields/values/${entityType}/${recordId}`, { values });
    return data.data;
  },
};

export const tenantsApi = {
  me: async () => { const { data } = await api.get('/tenants/me'); return data.data; },
  updateSettings: async (dto: any) => { const { data } = await api.patch('/tenants/me/settings', dto); return data.data; },
};

export const dashboardApi = {
  kpis: async () => { const { data } = await api.get('/dashboard/kpis'); return data.data; },
  pipeline: async () => { const { data } = await api.get('/dashboard/pipeline'); return data.data; },
  activities: async (limit = 20) => { const { data } = await api.get(`/dashboard/activities?limit=${limit}`); return data.data; },
  leadSources: async () => { const { data } = await api.get('/dashboard/lead-sources'); return data.data; },
};

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data.data;
  },
  register: async (dto: any) => {
    const { data } = await api.post('/auth/register', dto);
    return data.data;
  },
  me: async () => { const { data } = await api.get('/auth/me'); return data.data; },
  logout: async () => { await api.post('/auth/logout'); },
};
