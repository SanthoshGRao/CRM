'use client';

import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Eye, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { rolesApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { ErrorBanner } from '@/components/ui/Field';
import { usePermissions } from '@/lib/permissions';

/** Grouped for a compact matrix rather than 45 individual rows. */
const CAPABILITIES: Array<{ label: string; permissions: string[] }> = [
  { label: 'View records', permissions: ['contacts.view', 'companies.view', 'leads.view', 'deals.view'] },
  { label: 'Create & edit records', permissions: ['leads.create', 'leads.update'] },
  { label: 'Delete records', permissions: ['leads.delete'] },
  { label: 'Tasks', permissions: ['tasks.create', 'tasks.update'] },
  { label: 'Log activity', permissions: ['activities.create'] },
  { label: 'Reports', permissions: ['reports.view'] },
  { label: 'Custom fields', permissions: ['custom_fields.create'] },
  { label: 'Manage team', permissions: ['users.create'] },
  { label: 'Workspace settings', permissions: ['settings.update'] },
  { label: 'API keys', permissions: ['api_keys.create'] },
];

export function RolesPanel() {
  const { roles: myRoles } = usePermissions();

  const { data: roles = [], isLoading, isError, error } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list(),
  });

  if (isError) {
    return <ErrorBanner message={getErrorMessage(error, 'Could not load roles.')} />;
  }

  if (isLoading) {
    return <div className="skeleton h-64 max-w-4xl" />;
  }

  const list = roles as any[];

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Roles</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Assign these from the Team tab. Roles are fixed so access stays predictable.
            </p>
          </div>
        </div>

        <div className="card-body grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((role) => (
            <div
              key={role.id}
              className={clsx(
                'rounded-lg border p-4',
                myRoles.includes(role.name) ? 'border-brand-300 bg-brand-50' : 'border-slate-200',
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">{role.name}</p>
                {myRoles.includes(role.name) && <span className="badge badge-blue">You</span>}
              </div>
              <p className="mt-1 text-xs text-slate-600">{role.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {role.memberCount} member{role.memberCount === 1 ? '' : 's'}
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {role.dataScope === 'OWN' ? 'Own records' : 'All records'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-slate-800">What each role can do</h3>
          <span className="text-xs text-slate-400">{list.length} roles</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead className="table-header">
              <tr>
                <th>Capability</th>
                {list.map((r) => <th key={r.id} className="text-center">{r.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((cap) => (
                <tr key={cap.label} className="table-row cursor-default">
                  <td className="font-medium text-slate-800">{cap.label}</td>
                  {list.map((role) => {
                    const has = cap.permissions.every((p) => (role.permissions ?? []).includes(p));
                    return (
                      <td key={role.id} className="text-center">
                        {has ? (
                          <span className="text-emerald-600">✓</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="table-row cursor-default">
                <td className="font-medium text-slate-800">Records visible</td>
                {list.map((role) => (
                  <td key={role.id} className="text-center text-xs text-slate-600">
                    {role.dataScope === 'OWN' ? 'Own only' : 'All'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-surface-1 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <p className="text-xs text-slate-600">
          Changing someone&apos;s role takes effect the next time they sign in, because permissions
          travel in their session token.
        </p>
      </div>
    </div>
  );
}
