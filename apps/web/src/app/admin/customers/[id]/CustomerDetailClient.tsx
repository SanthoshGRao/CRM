'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Trash2, Loader2, ExternalLink, UserPlus, X, KeyRound, ShieldCheck,
} from 'lucide-react';
import { clsx } from 'clsx';
import { adminTenantsApi } from '@/lib/api/admin-client';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDate, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/ui/PageHeader';
import { Field, DetailRow, ErrorBanner } from '@/components/ui/Field';

export default function CustomerDetailClient({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setCrmSession = useAuthStore((s) => s.setSession);

  const [error, setError] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);

  const { data: tenant, isLoading, isError, error: loadError } = useQuery({
    queryKey: ['admin', 'tenant', tenantId],
    queryFn: () => adminTenantsApi.get(tenantId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'tenant', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
  };

  const updateStatus = useMutation({
    mutationFn: (status: string) => adminTenantsApi.update(tenantId, { status }),
    onSuccess: invalidate,
    onError: (err) => setError(getErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: () => adminTenantsApi.remove(tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      router.push('/admin/customers');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const removeUser = useMutation({
    mutationFn: (userId: string) => adminTenantsApi.removeUser(tenantId, userId),
    onSuccess: invalidate,
    onError: (err) => setError(getErrorMessage(err)),
  });

  // Swaps the browser into the customer's CRM using an impersonation token.
  const openWorkspace = useMutation({
    mutationFn: () => adminTenantsApi.access(tenantId),
    onSuccess: (data: any) => {
      setCrmSession(data.accessToken, data.session);
      router.push('/dashboard');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="skeleton h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="skeleton h-64 lg:col-span-1" />
          <div className="skeleton h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (isError || !tenant) {
    return (
      <div className="page-container">
        <PageHeader title="Customer company" backHref="/admin/customers" backLabel="Back to customers" />
        <ErrorBanner message={getErrorMessage(loadError, 'This customer company could not be found.')} />
      </div>
    );
  }

  const users: any[] = tenant.users ?? [];
  const apiKeys: any[] = tenant.apiKeys ?? [];
  const counts = tenant._count ?? {};

  return (
    <div className="page-container">
      <PageHeader
        title={tenant.name}
        subtitle={`${tenant.slug} · created ${formatDate(tenant.createdAt)}`}
        backHref="/admin/customers"
        backLabel="Back to customers"
        actions={
          <>
            <button
              className="btn-primary btn-sm"
              id="open-workspace-btn"
              disabled={openWorkspace.isPending}
              onClick={() => openWorkspace.mutate()}
            >
              {openWorkspace.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
              Open CRM
            </button>
            <button
              className="btn-secondary btn-sm"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate(tenant.status === 'active' ? 'suspended' : 'active')}
            >
              {tenant.status === 'active' ? 'Suspend' : 'Activate'}
            </button>
            <button
              className="btn-danger btn-sm"
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm(`Delete ${tenant.name} and ALL of its CRM data? This cannot be undone.`)) {
                  remove.mutate();
                }
              }}
            >
              {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
          </>
        }
      />

      <ErrorBanner message={error} />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Users', value: counts.users ?? 0 },
          { label: 'Contacts', value: counts.contacts ?? 0 },
          { label: 'Companies', value: counts.companies ?? 0 },
          { label: 'Leads', value: counts.leads ?? 0 },
          { label: 'Deals', value: counts.deals ?? 0 },
          { label: 'Tasks', value: counts.tasks ?? 0 },
        ].map((s) => (
          <div key={s.label} className="kpi-card">
            <span className="kpi-label">{s.label}</span>
            <span className="kpi-value">{s.value.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Workspace</h3></div>
          <div className="card-body divide-y divide-slate-100">
            <DetailRow label="Status">
              <span className={clsx('badge', tenant.status === 'active' ? 'badge-green' : tenant.status === 'suspended' ? 'badge-red' : 'badge-gray')}>
                {tenant.status}
              </span>
            </DetailRow>
            <DetailRow label="Plan">{tenant.plan ?? '—'}</DetailRow>
            <DetailRow label="Slug">{tenant.slug}</DetailRow>
            <DetailRow label="Currency">{tenant.settings?.currency ?? '—'}</DetailRow>
            <DetailRow label="Timezone">{tenant.settings?.timezone ?? '—'}</DetailRow>
            <DetailRow label="Created by">
              {tenant.createdBy ? `${tenant.createdBy.firstName} ${tenant.createdBy.lastName}` : 'System'}
            </DetailRow>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-800">Users</h3>
            <button className="btn-secondary btn-sm" onClick={() => setIsAddingUser(true)}>
              <UserPlus className="h-3.5 w-3.5" /> Add user
            </button>
          </div>

          {isAddingUser && (
            <AddUserForm
              tenantId={tenantId}
              roles={tenant.roles ?? []}
              onClose={() => setIsAddingUser(false)}
              onCreated={() => { setIsAddingUser(false); invalidate(); }}
            />
          )}

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead className="table-header">
                <tr><th>Name</th><th>Email</th><th>Roles</th><th>Status</th><th>Last login</th><th className="w-10" /></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="table-row cursor-default">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar-sm text-[10px]">{getInitials(u.firstName, u.lastName)}</div>
                        <span className="font-medium text-slate-900">{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="text-slate-600">{u.email}</td>
                    <td className="text-slate-600">
                      {(u.userRoles ?? []).map((ur: any) => ur.role?.name).filter(Boolean).join(', ') || '—'}
                    </td>
                    <td>
                      <span className={clsx('badge', u.status === 'active' ? 'badge-green' : 'badge-gray')}>{u.status}</span>
                    </td>
                    <td className="text-slate-500">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</td>
                    <td>
                      <button
                        className="rounded p-1 text-slate-400 hover:bg-surface-2 hover:text-red-600"
                        aria-label="Remove user"
                        disabled={removeUser.isPending || users.length <= 1}
                        title={users.length <= 1 ? 'A workspace must keep at least one user' : 'Remove user'}
                        onClick={() => { if (window.confirm(`Remove ${u.firstName} ${u.lastName}?`)) removeUser.mutate(u.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-slate-800">API keys</h3>
          <span className="text-xs text-slate-400">Created by the customer in their own settings</span>
        </div>
        <div className="overflow-x-auto">
          {apiKeys.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="mb-3 rounded-full bg-surface-2 p-4 text-slate-400"><KeyRound className="h-5 w-5" /></div>
              <p className="text-sm text-slate-500">This customer has not created any API keys.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead className="table-header">
                <tr><th>Name</th><th>Key</th><th>Scopes</th><th>Requests</th><th>Last used</th><th>Status</th></tr>
              </thead>
              <tbody>
                {apiKeys.map((k) => (
                  <tr key={k.id} className="table-row cursor-default">
                    <td className="font-medium text-slate-900">{k.name}</td>
                    <td className="font-mono text-xs text-slate-500">{k.keyPrefix}…</td>
                    <td>
                      {(k.scopes ?? []).map((s: string) => (
                        <span key={s} className="badge badge-blue mr-1">{s}</span>
                      ))}
                    </td>
                    <td className="text-slate-600">{k.requestCount ?? 0}</td>
                    <td className="text-slate-500">{k.lastUsedAt ? formatDate(k.lastUsedAt) : 'Never'}</td>
                    <td>
                      <span className={clsx('badge', k.revokedAt ? 'badge-red' : 'badge-green')}>
                        {k.revokedAt ? 'Revoked' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-xs text-amber-800">
          <span className="font-semibold">Open CRM</span> signs you into this customer&apos;s workspace as their Owner so you
          can add, change or remove their records. The session is logged against your admin account.
        </p>
      </div>
    </div>
  );
}

interface WorkspaceRole {
  id: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
}

function AddUserForm({
  tenantId, roles, onClose, onCreated,
}: {
  tenantId: string;
  roles: WorkspaceRole[];
  onClose: () => void;
  onCreated: () => void;
}) {
  // Comes from the workspace itself — hardcoding names here silently breaks the
  // moment they do not match the roles that were seeded.
  const defaultRole = roles.find((r) => r.isDefault)?.name ?? roles[0]?.name ?? '';

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', roleName: defaultRole,
  });
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) => setForm((p) => ({ ...p, [key]: value }));

  const create = useMutation({
    mutationFn: () => adminTenantsApi.addUser(tenantId, form),
    onSuccess: onCreated,
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <form
      className="border-b bg-surface-1 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        create.mutate();
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">Add a user to this workspace</p>
        <button type="button" className="rounded p-1 text-slate-400 hover:bg-surface-2" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name" htmlFor="new-user-first" required>
          <input id="new-user-first" className="input" required maxLength={50}
            value={form.firstName} onChange={(e) => set('firstName')((e.target as HTMLInputElement).value)} />
        </Field>
        <Field label="Last name" htmlFor="new-user-last" required>
          <input id="new-user-last" className="input" required maxLength={50}
            value={form.lastName} onChange={(e) => set('lastName')((e.target as HTMLInputElement).value)} />
        </Field>
        <Field label="Email" htmlFor="new-user-email" required>
          <input id="new-user-email" type="email" className="input" required
            value={form.email} onChange={(e) => set('email')((e.target as HTMLInputElement).value)} />
        </Field>
        <Field label="Temporary password" htmlFor="new-user-password" required>
          <input id="new-user-password" type="text" className="input" required minLength={8}
            value={form.password} onChange={(e) => set('password')((e.target as HTMLInputElement).value)} />
        </Field>
        <Field label="Role" htmlFor="new-user-role">
          <select id="new-user-role" className="input" value={form.roleName} required
            onChange={(e) => set('roleName')((e.target as HTMLSelectElement).value)}>
            {roles.length === 0 && <option value="">No roles in this workspace</option>}
            {roles.map((r) => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button type="submit" className="btn-primary btn-sm" disabled={create.isPending}>
          {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
          Add user
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}
