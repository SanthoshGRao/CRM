'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter, MoreHorizontal, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';
import api from '@/lib/api/client';
import { Can } from '@/components/ui/Can';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Deal } from '@crm/types';

async function fetchDeals(params: Record<string, any>) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  ).toString();
  const { data } = await api.get(`/deals?${query}`);
  return data;
}

const STATUS_CLASSES: Record<string, string> = {
  open: 'badge-blue', won: 'badge-green', lost: 'badge-red',
};

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center py-2">
          <div className="skeleton h-4 flex-1 max-w-[200px]" />
          <div className="skeleton h-4 flex-1 max-w-[140px]" />
          <div className="skeleton h-5 w-20 rounded-full" />
          <div className="skeleton h-4 flex-1 max-w-[100px]" />
        </div>
      ))}
    </div>
  );
}

export default function DealsClient() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['deals', { search, sortBy, sortOrder, page }],
    queryFn: () => fetchDeals({ search, sortBy, sortOrder, page, limit: 25 }),
    placeholderData: (prev) => prev,
  });

  const deals: Deal[] = data?.data ?? [];
  const pagination = data?.pagination;

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
    return sortOrder === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 text-brand-600" />
      : <ChevronDown className="h-3.5 w-3.5 text-brand-600" />;
  };

  const totalValue = deals.reduce((sum, d) => sum + Number(d.value ?? 0), 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Deals</h1>
          {pagination && (
            <p className="text-sm text-slate-500 mt-0.5">
              {pagination.total.toLocaleString()} deals · {formatCurrency(totalValue)} on this page
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Can permission="deals.create"><Link href="/deals/new" className="btn-primary btn-sm" id="create-deal-btn">
            <Plus className="h-3.5 w-3.5" /> Add Deal
          </Link></Can>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search deals..."
              className="input pl-9"
              id="deals-search"
              value={search}
              onChange={(e) => { setSearch((e.target as HTMLInputElement).value); setPage(1); }}
            />
          </div>
          <button className="btn-secondary btn-sm" id="deals-filter-btn">
            <Filter className="h-3.5 w-3.5" /> Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <TableSkeleton />
          ) : deals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Search className="h-8 w-8" /></div>
              <p className="empty-state-title">No deals found</p>
              <p className="empty-state-desc">
                {search ? 'Try a different search term.' : 'Create your first deal to get started.'}
              </p>
              {!search && (
                <Can permission="deals.create"><Link href="/deals/new" className="btn-primary" id="create-first-deal-btn">
                  <Plus className="h-4 w-4" /> Add Deal
                </Link></Can>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th>
                    <button className="flex items-center gap-1" onClick={() => toggleSort('name')}>
                      Deal Name <SortIcon field="name" />
                    </button>
                  </th>
                  <th>Company</th>
                  <th>Stage</th>
                  <th>Status</th>
                  <th>
                    <button className="flex items-center gap-1" onClick={() => toggleSort('value')}>
                      Value <SortIcon field="value" />
                    </button>
                  </th>
                  <th>Probability</th>
                  <th>Owner</th>
                  <th>
                    <button className="flex items-center gap-1" onClick={() => toggleSort('expectedCloseDate')}>
                      Close Date <SortIcon field="expectedCloseDate" />
                    </button>
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} className="table-row">
                    <td>
                      <Link href={`/deals/${deal.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                        {deal.name}
                      </Link>
                    </td>
                    <td className="text-slate-600">{(deal as any).company?.name ?? '—'}</td>
                    <td>
                      {(deal as any).stage && (
                        <span className="flex items-center gap-1.5 text-sm">
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: (deal as any).stage.color }} />
                          {(deal as any).stage.name}
                        </span>
                      )}
                    </td>
                    <td><span className={clsx('badge', STATUS_CLASSES[deal.status] ?? 'badge-gray')}>{deal.status}</span></td>
                    <td className="font-medium text-slate-800">{formatCurrency(Number(deal.value ?? 0))}</td>
                    <td className="text-slate-600">{deal.probability ?? 0}%</td>
                    <td>
                      {(deal as any).owner ? (
                        <div className="flex items-center gap-2">
                          <div className="avatar-sm text-[10px]">
                            {`${(deal as any).owner.firstName[0]}${(deal as any).owner.lastName[0]}`.toUpperCase()}
                          </div>
                          <span className="text-slate-600">{(deal as any).owner.firstName}</span>
                        </div>
                      ) : <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="text-slate-500">{deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : '—'}</td>
                    <td>
                      <button className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-surface-2">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
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
              <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} id="deals-prev-page">Previous</button>
              <button className="btn-secondary btn-sm" disabled={page === pagination.totalPages} onClick={() => setPage((p) => p + 1)} id="deals-next-page">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
