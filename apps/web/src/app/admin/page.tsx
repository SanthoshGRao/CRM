'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Building2, Users, KeyRound, Plus, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { adminTenantsApi } from '@/lib/api/admin-client';
import { formatDate, rowNavigate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';

export default function AdminOverviewPage() {
  const router = useRouter();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminTenantsApi.stats(),
  });

  const { data: recent } = useQuery({
    queryKey: ['admin', 'tenants', 'recent'],
    queryFn: () => adminTenantsApi.list({ limit: 5 }),
  });

  // Deliberately no CRM figures here — leads, deals and pipeline belong to the
  // customer's workspace, not the provider console.
  const cards = [
    { label: 'Customer companies', value: stats?.tenants ?? 0, icon: Building2, tone: 'bg-brand-50 text-brand-600' },
    { label: 'Active', value: stats?.activeTenants ?? 0, icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Suspended', value: Math.max((stats?.tenants ?? 0) - (stats?.activeTenants ?? 0), 0), icon: Building2, tone: 'bg-red-50 text-red-600' },
    { label: 'Users across clients', value: stats?.users ?? 0, icon: Users, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Live API keys', value: stats?.apiKeys ?? 0, icon: KeyRound, tone: 'bg-amber-50 text-amber-600' },
  ];

  const tenants: any[] = (recent as any)?.data ?? [];

  return (
    <div className="page-container">
      <PageHeader
        title="Overview"
        subtitle="Every customer company you host."
        actions={
          <Link href="/admin/customers/new" className="btn-primary btn-sm">
            <Plus className="h-3.5 w-3.5" /> New customer
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="kpi-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="kpi-label">{c.label}</p>
                <p className="kpi-value mt-1">{isLoading ? '—' : c.value.toLocaleString()}</p>
              </div>
              <div className={`rounded-lg p-2.5 ${c.tone}`}>
                <c.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-slate-800">Recently added</h3>
          <Link href="/admin/customers" className="text-xs font-medium text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          {tenants.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Building2 className="h-8 w-8" /></div>
              <p className="empty-state-title">No customer companies yet</p>
              <p className="empty-state-desc">Provision your first customer to get them into the CRM.</p>
              <Link href="/admin/customers/new" className="btn-primary">
                <Plus className="h-4 w-4" /> New customer
              </Link>
            </div>
          ) : (
            <table className="data-table">
              <thead className="table-header">
                <tr><th>Company</th><th>Status</th><th>Plan</th><th>Users</th><th>Created</th></tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="table-row" onClick={rowNavigate(() => router.push(`/admin/customers/${t.id}`))}>
                    <td>
                      <Link href={`/admin/customers/${t.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                        {t.name}
                      </Link>
                      <p className="text-xs text-slate-500">{t.slug}</p>
                    </td>
                    <td>
                      <span className={clsx('badge', t.status === 'active' ? 'badge-green' : 'badge-gray')}>
                        {t.status}
                      </span>
                    </td>
                    <td className="text-slate-600">{t.plan ?? '—'}</td>
                    <td className="text-slate-600">{t._count?.users ?? 0}</td>
                    <td className="text-slate-500">{formatDate(t.createdAt)}</td>
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
