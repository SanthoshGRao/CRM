'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Search, MoreHorizontal, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';
import api from '@/lib/api/client';
import { dealsApi } from '@/lib/api/services';
import { Can } from '@/components/ui/Can';
import { formatCurrency, formatDate, rowNavigate } from '@/lib/utils';
import { FilterBuilder } from '@/components/views/FilterBuilder';
import { ColumnPicker } from '@/components/views/ColumnPicker';
import { SavedViewsBar } from '@/components/views/SavedViewsBar';
import { BulkActionBar } from '@/components/views/BulkActionBar';
import { fieldsFor, defaultColumns, type EntityFieldDef } from '@/lib/views/entityFields';
import type { Deal, FilterCondition, SavedView } from '@crm/types';

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

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const FIELDS = fieldsFor('deal');
const SORTABLE_TYPES = new Set(['string', 'number', 'date', 'select']);

function fieldOf(key: string): EntityFieldDef {
  return FIELDS.find((f) => f.key === key) ?? FIELDS[0];
}

function DealCell({ deal, columnKey }: { deal: any; columnKey: string }) {
  switch (columnKey) {
    case 'companyId':
      return <span className="text-slate-600">{deal.company?.name ?? '—'}</span>;
    case 'status':
      return <span className={clsx('badge', STATUS_CLASSES[deal.status] ?? 'badge-gray')}>{deal.status}</span>;
    case 'value':
      return <span className="font-medium text-slate-800">{formatCurrency(Number(deal.value ?? 0))}</span>;
    case 'probability':
      return <span className="text-slate-600">{deal.probability ?? 0}%</span>;
    case 'ownerId':
      return deal.owner ? (
        <div className="flex items-center gap-2">
          <div className="avatar-sm text-[10px]">{`${deal.owner.firstName[0]}${deal.owner.lastName[0]}`.toUpperCase()}</div>
          <span className="text-slate-600">{deal.owner.firstName}</span>
        </div>
      ) : <span className="text-slate-400">Unassigned</span>;
    case 'contactId':
      return <span className="text-slate-600">{deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : '—'}</span>;
    case 'expectedCloseDate':
      return <span className="text-slate-500">{deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : '—'}</span>;
    case 'createdAt':
      return <span className="text-slate-500">{formatDate(deal.createdAt)}</span>;
    default:
      return null;
  }
}

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [columns, setColumns] = useState<string[]>(defaultColumns('deal'));
  const [activeView, setActiveView] = useState<SavedView | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtersParam = filters.length > 0 ? JSON.stringify(filters) : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['deals', { search, sortBy, sortOrder, page, filtersParam }],
    queryFn: () => fetchDeals({ search, filters: filtersParam, sortBy, sortOrder, page, limit: 25 }),
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

  function applyView(view: SavedView | null) {
    setActiveView(view);
    setPage(1);
    if (!view) {
      setFilters([]);
      setColumns(defaultColumns('deal'));
      setSortBy('createdAt');
      setSortOrder('desc');
      return;
    }
    setFilters(view.filters ?? []);
    setColumns(view.columns?.length ? view.columns : defaultColumns('deal'));
    if (view.sortBy) setSortBy(view.sortBy);
    if (view.sortOrder === 'asc' || view.sortOrder === 'desc') setSortOrder(view.sortOrder);
  }

  function toggleAll() {
    setSelectedIds((prev) => (prev.size === deals.length ? new Set() : new Set(deals.map((d) => d.id))));
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function afterBulkAction() {
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['deals'] });
  }

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
        <SavedViewsBar
          entityType="deal"
          entityLabel="deals"
          activeView={activeView}
          current={{ filters, columns, sortBy, sortOrder }}
          onSelect={applyView}
        />

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
          <FilterBuilder entityType="deal" value={filters} onChange={(f) => { setFilters(f); setPage(1); }} />
          <ColumnPicker entityType="deal" value={columns} onChange={setColumns} />
        </div>

        {selectedIds.size > 0 && (
          <BulkActionBar
            count={selectedIds.size}
            entityLabelPlural="deals"
            statusOptions={STATUS_OPTIONS}
            onClear={() => setSelectedIds(new Set())}
            onUpdate={async (updates) => {
              await dealsApi.bulkUpdate([...selectedIds], updates);
              afterBulkAction();
            }}
            onDelete={async () => {
              await dealsApi.bulkDelete([...selectedIds]);
              afterBulkAction();
            }}
          />
        )}

        <div className="overflow-x-auto">
          {isLoading ? (
            <TableSkeleton />
          ) : deals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Search className="h-8 w-8" /></div>
              <p className="empty-state-title">No deals found</p>
              <p className="empty-state-desc">
                {search || filters.length > 0 ? 'Try different search or filters.' : 'Create your first deal to get started.'}
              </p>
              {!search && filters.length === 0 && (
                <Can permission="deals.create"><Link href="/deals/new" className="btn-primary" id="create-first-deal-btn">
                  <Plus className="h-4 w-4" /> Add Deal
                </Link></Can>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === deals.length && deals.length > 0}
                      onChange={toggleAll}
                      aria-label="Select all deals"
                    />
                  </th>
                  <th>
                    <button className="flex items-center gap-1" onClick={() => toggleSort('name')}>
                      Deal Name <SortIcon field="name" />
                    </button>
                  </th>
                  <th>Stage</th>
                  {columns.map((key) => {
                    const field = fieldOf(key);
                    return (
                      <th key={key}>
                        {SORTABLE_TYPES.has(field.type) ? (
                          <button className="flex items-center gap-1" onClick={() => toggleSort(key)}>
                            {field.label} <SortIcon field={key} />
                          </button>
                        ) : field.label}
                      </th>
                    );
                  })}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} className="table-row" onClick={rowNavigate(() => router.push(`/deals/${deal.id}`))}>
                    <td>
                      <input type="checkbox" checked={selectedIds.has(deal.id)} onChange={() => toggleOne(deal.id)} aria-label={`Select ${deal.name}`} />
                    </td>
                    <td>
                      <Link href={`/deals/${deal.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                        {deal.name}
                      </Link>
                    </td>
                    <td>
                      {(deal as any).stage && (
                        <span className="flex items-center gap-1.5 text-sm">
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: (deal as any).stage.color }} />
                          {(deal as any).stage.name}
                        </span>
                      )}
                    </td>
                    {columns.map((key) => (
                      <td key={key}><DealCell deal={deal} columnKey={key} /></td>
                    ))}
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
