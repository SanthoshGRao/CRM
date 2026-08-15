'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, Save, Check, Users as UsersIcon, Building2, SlidersHorizontal,
  KeyRound, Columns3, UserPlus, Trash2, X, ShieldCheck,
} from 'lucide-react';
import { clsx } from 'clsx';
import { tenantsApi, usersApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDate, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/ui/PageHeader';
import { usePermissions } from '@/lib/permissions';
import { Field, DetailRow, ErrorBanner } from '@/components/ui/Field';
import { ApiKeysPanel } from './ApiKeysPanel';
import { CustomFieldsPanel } from './CustomFieldsPanel';
import { RolesPanel } from './RolesPanel';

const TABS = [
  { id: 'workspace', label: 'Workspace', icon: Building2, permission: null },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal, permission: 'settings.update' },
  { id: 'fields', label: 'Custom fields', icon: Columns3, permission: 'custom_fields.view' },
  { id: 'team', label: 'Team', icon: UsersIcon, permission: 'users.view' },
  { id: 'roles', label: 'Roles', icon: ShieldCheck, permission: 'roles.view' },
  { id: 'api', label: 'API keys', icon: KeyRound, permission: 'api_keys.view' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'UTC'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const LOCALES = ['en', 'hi', 'ta', 'te'];

export default function SettingsClient() {
  const { can } = usePermissions();
  const [tab, setTab] = useState<TabId>('workspace');
  const session = useAuthStore((s) => s.session);

  const visibleTabs = TABS.filter((t) => !t.permission || can(t.permission));
  const activeTab: TabId = visibleTabs.some((t) => t.id === tab) ? tab : 'workspace';

  const { data: tenant, isLoading, isError, error } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => tenantsApi.me(),
  });

  return (
    <div className="page-container">
      <PageHeader title="Settings" subtitle={session?.tenant?.name ?? 'Workspace configuration'} />

      <div className="flex gap-1 border-b border-slate-200">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === t.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {isError && <ErrorBanner message={getErrorMessage(error, 'Could not load workspace settings.')} />}

      {isLoading ? (
        <div className="skeleton h-64 max-w-2xl" />
      ) : (
        <>
          {activeTab === 'workspace' && <WorkspacePanel tenant={tenant} />}
          {activeTab === 'preferences' && <PreferencesPanel tenant={tenant} />}
          {activeTab === 'fields' && <CustomFieldsPanel />}
          {activeTab === 'team' && <TeamPanel />}
          {activeTab === 'roles' && <RolesPanel />}
          {activeTab === 'api' && <ApiKeysPanel />}
        </>
      )}
    </div>
  );
}

function WorkspacePanel({ tenant }: { tenant: any }) {
  const session = useAuthStore((s) => s.session);
  const features: any[] = tenant?.features ?? [];

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
      <div className="card">
        <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Workspace</h3></div>
        <div className="card-body divide-y divide-slate-100">
          <DetailRow label="Name">{tenant?.name ?? '—'}</DetailRow>
          <DetailRow label="Slug">{tenant?.slug ?? '—'}</DetailRow>
          <DetailRow label="Status">
            <span className={clsx('badge', tenant?.status === 'active' ? 'badge-green' : 'badge-gray')}>
              {tenant?.status ?? 'unknown'}
            </span>
          </DetailRow>
          <DetailRow label="Created">{tenant?.createdAt ? formatDate(tenant.createdAt) : '—'}</DetailRow>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Your account</h3></div>
        <div className="card-body divide-y divide-slate-100">
          <DetailRow label="Name">
            {session?.user ? `${session.user.firstName} ${session.user.lastName}` : '—'}
          </DetailRow>
          <DetailRow label="Email">{session?.user?.email ?? '—'}</DetailRow>
          <DetailRow label="Roles">
            {session?.roles?.length ? session.roles.join(', ') : '—'}
          </DetailRow>
          <DetailRow label="Permissions">{session?.permissions?.length ?? 0} granted</DetailRow>
        </div>
      </div>

      <div className="card lg:col-span-2">
        <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Features</h3></div>
        <div className="card-body">
          {features.length === 0 ? (
            <p className="text-sm text-slate-400">No feature flags configured.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {features.map((f) => (
                <li key={f.id ?? f.feature} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                  <span className="text-sm capitalize text-slate-700">{String(f.feature).replace(/_/g, ' ')}</span>
                  <span className={clsx('badge', f.enabled ? 'badge-green' : 'badge-gray')}>
                    {f.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function PreferencesPanel({ tenant }: { tenant: any }) {
  const queryClient = useQueryClient();
  const settings = tenant?.settings;

  const [values, setValues] = useState({
    timezone: settings?.timezone ?? 'Asia/Kolkata',
    locale: settings?.locale ?? 'en',
    dateFormat: settings?.dateFormat ?? 'DD/MM/YYYY',
    currency: settings?.currency ?? 'INR',
    brandColor: settings?.brandColor ?? '#4f46e5',
    emailFooter: settings?.emailFooter ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Settings arrive after the first render when the query resolves.
  useEffect(() => {
    if (!settings) return;
    setValues({
      timezone: settings.timezone ?? 'Asia/Kolkata',
      locale: settings.locale ?? 'en',
      dateFormat: settings.dateFormat ?? 'DD/MM/YYYY',
      currency: settings.currency ?? 'INR',
      brandColor: settings.brandColor ?? '#4f46e5',
      emailFooter: settings.emailFooter ?? '',
    });
  }, [settings]);

  const save = useMutation({
    mutationFn: () => tenantsApi.updateSettings(values),
    onSuccess: () => {
      setSaved(true);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const set = (key: keyof typeof values) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="max-w-2xl"
      onSubmit={(e) => { e.preventDefault(); setError(null); save.mutate(); }}
    >
      <div className="card">
        <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Regional preferences</h3></div>
        <div className="card-body grid gap-4 sm:grid-cols-2">
          <Field label="Timezone" htmlFor="settings-timezone">
            <select id="settings-timezone" className="input" value={values.timezone}
              onChange={(e) => set('timezone')((e.target as HTMLSelectElement).value)}>
              {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Currency" htmlFor="settings-currency">
            <select id="settings-currency" className="input" value={values.currency}
              onChange={(e) => set('currency')((e.target as HTMLSelectElement).value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Date format" htmlFor="settings-date-format">
            <select id="settings-date-format" className="input" value={values.dateFormat}
              onChange={(e) => set('dateFormat')((e.target as HTMLSelectElement).value)}>
              {DATE_FORMATS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>

          <Field label="Language" htmlFor="settings-locale">
            <select id="settings-locale" className="input" value={values.locale}
              onChange={(e) => set('locale')((e.target as HTMLSelectElement).value)}>
              {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>

          <Field label="Brand colour" htmlFor="settings-brand-color">
            <div className="flex items-center gap-2">
              <input id="settings-brand-color" type="color" className="h-9 w-12 rounded border border-slate-300"
                value={values.brandColor} onChange={(e) => set('brandColor')((e.target as HTMLInputElement).value)} />
              <input className="input" value={values.brandColor}
                onChange={(e) => set('brandColor')((e.target as HTMLInputElement).value)} />
            </div>
          </Field>

          <Field label="Email footer" htmlFor="settings-email-footer" className="sm:col-span-2">
            <textarea id="settings-email-footer" className="input min-h-[80px]" placeholder="Appended to outgoing emails"
              value={values.emailFooter} onChange={(e) => set('emailFooter')((e.target as HTMLTextAreaElement).value)} />
          </Field>
        </div>
      </div>

      {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

      <div className="mt-4 flex items-center gap-3">
        <button type="submit" className="btn-primary" id="save-settings-btn" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save preferences
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </form>
  );
}

function TeamPanel() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const currentUserId = useAuthStore((s) => s.session?.user?.id);
  const [isAdding, setIsAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list({ limit: 100 }),
  });

  const removeUser = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (err) => setActionError(getErrorMessage(err)),
  });


  const users: any[] = (data as any)?.data ?? [];

  if (isError) {
    return <ErrorBanner message={getErrorMessage(error, 'Could not load team members.')} />;
  }

  return (
    <div className="flex max-w-4xl flex-col gap-4">
    <ErrorBanner message={actionError} />
    <div className="card">
      <div className="card-header">
        <h3 className="text-sm font-semibold text-slate-800">Team members</h3>
        {can('users.create') && (
          <button className="btn-primary btn-sm" id="add-team-member-btn" onClick={() => setIsAdding(true)}>
            <UserPlus className="h-3.5 w-3.5" /> Add member
          </button>
        )}
      </div>

      {isAdding && (
        <AddMemberForm
          onClose={() => setIsAdding(false)}
          onCreated={() => {
            setIsAdding(false);
            queryClient.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="skeleton h-8 w-8 rounded-full" />
                <div className="skeleton h-4 max-w-[200px] flex-1" />
                <div className="skeleton h-4 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <table className="data-table">
            <thead className="table-header">
              <tr><th>Member</th><th>Email</th><th>Roles</th><th>Status</th><th>Last login</th><th className="w-10" /></tr>
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
                    {u.id !== currentUserId && can('users.delete') && (
                      <button
                        className="rounded p-1 text-slate-400 hover:bg-surface-2 hover:text-red-600"
                        aria-label="Remove member"
                        disabled={removeUser.isPending}
                        onClick={() => {
                          if (window.confirm(`Remove ${u.firstName} ${u.lastName} from this workspace?`)) {
                            removeUser.mutate(u.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </div>
  );
}

function AddMemberForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', roleId: '' });
  const [error, setError] = useState<string | null>(null);

  const { data: roles = [] } = useQuery({
    queryKey: ['users', 'roles'],
    queryFn: () => usersApi.roles(),
  });

  // Roles arrive after the first render, so seed the picker once they land —
  // otherwise the select shows a role that was never actually chosen.
  useEffect(() => {
    const list = roles as any[];
    if (form.roleId || list.length === 0) return;
    setForm((p) => ({ ...p, roleId: (list.find((r) => r.isDefault) ?? list[0]).id }));
  }, [roles, form.roleId]);

  const set = (key: keyof typeof form) => (value: string) => setForm((p) => ({ ...p, [key]: value }));

  const create = useMutation({
    mutationFn: () =>
      usersApi.create({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        roleId: form.roleId || undefined,
      }),
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
        <p className="text-sm font-medium text-slate-800">Add a team member</p>
        <button type="button" className="rounded p-1 text-slate-400 hover:bg-surface-2" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name" htmlFor="member-first" required>
          <input id="member-first" className="input" required maxLength={50}
            value={form.firstName} onChange={(e) => set('firstName')((e.target as HTMLInputElement).value)} />
        </Field>
        <Field label="Last name" htmlFor="member-last" required>
          <input id="member-last" className="input" required maxLength={50}
            value={form.lastName} onChange={(e) => set('lastName')((e.target as HTMLInputElement).value)} />
        </Field>
        <Field label="Email" htmlFor="member-email" required>
          <input id="member-email" type="email" className="input" required
            value={form.email} onChange={(e) => set('email')((e.target as HTMLInputElement).value)} />
        </Field>
        <Field label="Temporary password" htmlFor="member-password" required hint="Minimum 8 characters">
          <input id="member-password" type="text" className="input" required minLength={8}
            value={form.password} onChange={(e) => set('password')((e.target as HTMLInputElement).value)} />
        </Field>
        <Field label="Role" htmlFor="member-role" className="sm:col-span-2">
          <select id="member-role" className="input" value={form.roleId} required
            onChange={(e) => set('roleId')((e.target as HTMLSelectElement).value)}>
            {(roles as any[]).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}{r.isDefault ? ' (default)' : ''}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button type="submit" className="btn-primary btn-sm" disabled={create.isPending}>
          {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
          Add member
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}
