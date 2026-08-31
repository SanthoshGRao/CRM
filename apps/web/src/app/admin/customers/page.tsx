'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Building2 } from 'lucide-react';
import { clsx } from 'clsx';
import { adminTenantsApi } from '@/lib/api/admin-client';
import { formatDate, rowNavigate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Pending', value: 'pending' },
];

export default function AdminCustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'tenants', { search, status, page }],
    queryFn: () => adminTenantsApi.list({ search, status, page, limit: 25 }),
    placeholderData: (prev) => prev,
  });

  const tenants: any[] = (data as any)?.data ?? [];
  const pagination = (data as any)?.pagination;

  return (
    <div className="page-container">
      <PageHeader
        title="Customer companies"
        subtitle={pagination ? `${pagination.total.toLocaleString()} companies` : undefined}
        actions={
          <Link href="/admin/customers/new" className="btn-primary btn-sm" id="new-customer-btn">
            <Plus className="h-3.5 w-3.5" /> New customer
          </Link>
        }
      />

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search companies..."
              className="input pl-9"
              id="admin-customers-search"
              value={search}
              onChange={(e) => { setSearch((e.target as HTMLInputElement).value); setPage(1); }}
            />
          </div>
          <div className="flex overflow-hidden rounded-md border border-slate-300">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.label}
                className={clsx(
                  'px-3 py-1.5 text-sm',
                  status === f.value ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-surface-2',
                )}
                onClick={() => { setStatus(f.value); setPage(1); }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border-t">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="skeleton h-8 w-8 rounded-lg" />
                  <div className="skeleton h-4 max-w-[220px] flex-1" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                  <div className="skeleton h-4 w-24" />
                </div>
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Building2 className="h-8 w-8" /></div>
              <p className="empty-state-title">No customer companies found</p>
              <p className="empty-state-desc">Provision a customer company and its first Owner user.</p>
              <Link href="/admin/customers/new" className="btn-primary">
                <Plus className="h-4 w-4" /> New customer
              </Link>
            </div>
          ) : (
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th>Company</th><th>Status</th><th>Plan</th><th>Users</th>
                  <th>Contacts</th><th>Leads</th><th>Deals</th><th>API keys</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="table-row" onClick={rowNavigate(() => router.push(`/admin/customers/${t.id}`))}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <Link href={`/admin/customers/${t.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                            {t.name}
                          </Link>
                          <p className="text-xs text-slate-500">{t.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={clsx('badge', t.status === 'active' ? 'badge-green' : t.status === 'suspended' ? 'badge-red' : 'badge-gray')}>
                        {t.status}
                      </span>
                    </td>
                    <td className="text-slate-600">{t.plan ?? '—'}</td>
                    <td className="text-slate-600">{t._count?.users ?? 0}</td>
                    <td className="text-slate-600">{t._count?.contacts ?? 0}</td>
                    <td className="text-slate-600">{t._count?.leads ?? 0}</td>
                    <td className="text-slate-600">{t._count?.deals ?? 0}</td>
                    <td className="text-slate-600">{t._count?.apiKeys ?? 0}</td>
                    <td className="text-slate-500">{formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-slate-500">Page {page} of {pagination.totalPages}</p>
            <div className="flex gap-1">
              <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn-secondary btn-sm" disabled={page === pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
