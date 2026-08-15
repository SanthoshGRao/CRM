'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { activitiesApi } from '@/lib/api/services';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { ACTIVITY_ICONS } from '@/components/detail/ActivityTimeline';
import { Activity as ActivityIcon } from 'lucide-react';

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Calls', value: 'call' },
  { label: 'Emails', value: 'email' },
  { label: 'Meetings', value: 'meeting' },
  { label: 'Messages', value: 'whatsapp,sms' },
  { label: 'Notes', value: 'note' },
];

function relatedLink(a: any): { href: string; label: string } | null {
  if (a.relatedContact) return { href: `/contacts/${a.relatedContact.id}`, label: `${a.relatedContact.firstName} ${a.relatedContact.lastName}` };
  if (a.relatedCompany) return { href: `/companies/${a.relatedCompany.id}`, label: a.relatedCompany.name };
  if (a.relatedLead) return { href: `/leads/${a.relatedLead.id}`, label: a.relatedLead.title };
  if (a.relatedDeal) return { href: `/deals/${a.relatedDeal.id}`, label: a.relatedDeal.name };
  return null;
}

export default function CommunicationsClient() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['activities', { search, type, page }],
    queryFn: () => activitiesApi.list({ search, type, page, limit: 25 }),
    placeholderData: (prev) => prev,
  });

  const { data: stats = [] } = useQuery({
    queryKey: ['activities', 'stats'],
    queryFn: () => activitiesApi.stats(),
  });

  const activities: any[] = (data as any)?.data ?? [];
  const pagination = (data as any)?.pagination;

  const totalsByType = Object.fromEntries((stats as any[]).map((s) => [s.type, s.count]));
  const summary = [
    { label: 'Calls', value: totalsByType.call ?? 0 },
    { label: 'Emails', value: totalsByType.email ?? 0 },
    { label: 'Meetings', value: totalsByType.meeting ?? 0 },
    { label: 'Notes', value: totalsByType.note ?? 0 },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Communications"
        subtitle={pagination ? `${pagination.total.toLocaleString()} logged interactions` : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="kpi-card">
            <span className="kpi-label">{s.label}</span>
            <span className="kpi-value">{s.value.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search communications..."
              className="input pl-9"
              id="communications-search"
              value={search}
              onChange={(e) => { setSearch((e.target as HTMLInputElement).value); setPage(1); }}
            />
          </div>
          <div className="flex flex-wrap overflow-hidden rounded-md border border-slate-300">
            {FILTERS.map((f) => (
              <button
                key={f.label}
                className={clsx(
                  'px-3 py-1.5 text-sm',
                  type === f.value ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-surface-2',
                )}
                onClick={() => { setType(f.value); setPage(1); }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="skeleton h-8 w-8 rounded-full" />
                  <div className="skeleton h-4 max-w-[280px] flex-1" />
                  <div className="skeleton h-4 w-24" />
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><MessageSquare className="h-8 w-8" /></div>
              <p className="empty-state-title">No communications yet</p>
              <p className="empty-state-desc">
                Calls, emails and notes logged against contacts, companies, leads and deals show up here.
              </p>
              <Link href="/contacts" className="btn-primary">Go to contacts</Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activities.map((a) => {
                const Icon = ACTIVITY_ICONS[a.type] ?? ActivityIcon;
                const related = relatedLink(a);
                return (
                  <li key={a.id} className="flex items-start gap-4 px-4 py-3.5 hover:bg-surface-1">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-slate-500">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{a.title}</p>
                      {a.description && <p className="mt-0.5 text-sm text-slate-500">{a.description}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="capitalize">{String(a.type).replace(/_/g, ' ')}</span>
                        {related && (
                          <>
                            <span>·</span>
                            <Link href={related.href} className="text-brand-600 hover:underline">{related.label}</Link>
                          </>
                        )}
                        {a.performedBy && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="avatar-sm h-5 w-5 text-[9px]">
                                {getInitials(a.performedBy.firstName, a.performedBy.lastName)}
                              </span>
                              {a.performedBy.firstName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{formatRelativeTime(a.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
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
