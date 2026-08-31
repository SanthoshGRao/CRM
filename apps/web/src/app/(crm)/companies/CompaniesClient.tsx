'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Search, Download, Upload, MoreHorizontal, Building2, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api/client';
import { companiesApi } from '@/lib/api/services';
import { Can } from '@/components/ui/Can';
import { formatDate, formatCurrency, getInitials, rowNavigate } from '@/lib/utils';
import { FilterBuilder } from '@/components/views/FilterBuilder';
import { ColumnPicker } from '@/components/views/ColumnPicker';
import { SavedViewsBar } from '@/components/views/SavedViewsBar';
import { BulkActionBar } from '@/components/views/BulkActionBar';
import { fieldsFor, defaultColumns, type EntityFieldDef } from '@/lib/views/entityFields';
import type { Company, FilterCondition, SavedView } from '@crm/types';
import { clsx } from 'clsx';
import { ImportDialog } from '@/components/import/ImportDialog';

async function fetchCompanies(params: Record<string, any>) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  ).toString();
  const { data } = await api.get(`/companies?${query}`);
  return data;
}

const STATUS_CLASSES: Record<string, string> = {
  active: 'badge-green', inactive: 'badge-gray',
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const FIELDS = fieldsFor('company');

function fieldOf(key: string): EntityFieldDef {
  return FIELDS.find((f) => f.key === key) ?? FIELDS[0];
}

function CompanyCell({ company, columnKey }: { company: any; columnKey: string }) {
  switch (columnKey) {
    case 'industry':
      return <span className="text-slate-600">{company.industry ?? '—'}</span>;
    case 'website':
      return <span className="text-slate-600">{company.website ?? '—'}</span>;
    case 'phone':
      return <span className="text-slate-600">{company.phone ?? '—'}</span>;
    case 'city':
      return <span className="text-slate-600">{company.city ?? '—'}</span>;
    case 'country':
      return <span className="text-slate-600">{company.country ?? '—'}</span>;
    case 'employees':
      return <span className="text-slate-600">{company.employees ?? '—'}</span>;
    case 'annualRevenue':
      return <span className="font-medium text-slate-800">{company.annualRevenue != null ? formatCurrency(Number(company.annualRevenue)) : '—'}</span>;
    case 'ownerId':
      return company.owner ? (
        <div className="flex items-center gap-2">
          <div className="avatar-sm text-[10px]">{getInitials(company.owner.firstName, company.owner.lastName)}</div>
          <span className="text-slate-600">{company.owner.firstName}</span>
        </div>
      ) : <span className="text-slate-400">—</span>;
    case 'status':
      return <span className={clsx('badge', STATUS_CLASSES[company.status] ?? 'badge-gray')}>{company.status}</span>;
    case 'createdAt':
      return <span className="text-slate-500">{formatDate(company.createdAt)}</span>;
    default:
      return null;
  }
}

export default function CompaniesClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [customersOnly, setCustomersOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [columns, setColumns] = useState<string[]>(defaultColumns('company'));
  const [activeView, setActiveView] = useState<SavedView | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtersParam = filters.length > 0 ? JSON.stringify(filters) : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['companies', { search, page, customersOnly, filtersParam }],
    queryFn: () => fetchCompanies({ search, filters: filtersParam, page, limit: 25, isCustomer: customersOnly ? 'true' : undefined }),
    placeholderData: (prev) => prev,
  });

  const companies: Company[] = data?.data ?? [];
  const pagination = data?.pagination;

  function applyView(view: SavedView | null) {
    setActiveView(view);
    setPage(1);
    if (!view) {
      setFilters([]);
      setColumns(defaultColumns('company'));
      return;
    }
    setFilters(view.filters ?? []);
    setColumns(view.columns?.length ? view.columns : defaultColumns('company'));
  }

  function toggleAll() {
    setSelectedIds((prev) => (prev.size === companies.length ? new Set() : new Set(companies.map((c) => c.id))));
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
    queryClient.invalidateQueries({ queryKey: ['companies'] });
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{customersOnly ? 'Customers' : 'Companies'}</h1>
          {pagination && (
            <p className="text-sm text-slate-500 mt-0.5">
              {pagination.total.toLocaleString()} {customersOnly ? 'customers' : 'companies'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary btn-sm" id="export-companies-btn"><Download className="h-3.5 w-3.5" /> Export</button>
          <Can permission="companies.create">
            <button className="btn-secondary btn-sm" id="import-companies-btn" onClick={() => setImportOpen(true)}><Upload className="h-3.5 w-3.5" /> Import</button>
          </Can>
          <Can permission="companies.create"><Link href="/companies/new" className="btn-primary btn-sm" id="create-company-btn"><Plus className="h-3.5 w-3.5" /> Add Company</Link></Can>
        </div>
      </div>

      <div className="card">
        <SavedViewsBar
          entityType="company"
          entityLabel="companies"
          activeView={activeView}
          current={{ filters, columns }}
          onSelect={applyView}
        />

        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search companies..." className="input pl-9" id="companies-search" value={search} onChange={(e) => { setSearch((e.target as HTMLInputElement).value); setPage(1); }} />
          </div>
          <FilterBuilder entityType="company" value={filters} onChange={(f) => { setFilters(f); setPage(1); }} />
          <ColumnPicker entityType="company" value={columns} onChange={setColumns} />
          <button
            type="button"
            className={clsx('btn-sm flex items-center gap-1.5', customersOnly ? 'btn-primary' : 'btn-secondary')}
            id="customers-only-toggle"
            onClick={() => { setCustomersOnly((v) => !v); setPage(1); }}
            title="Show only companies with at least one won deal"
          >
            <BadgeCheck className="h-3.5 w-3.5" /> Customers only
          </button>
        </div>

        {selectedIds.size > 0 && (
          <BulkActionBar
            count={selectedIds.size}
            entityLabelPlural="companies"
            statusOptions={STATUS_OPTIONS}
            onClear={() => setSelectedIds(new Set())}
            onUpdate={async (updates) => {
              await companiesApi.bulkUpdate([...selectedIds], updates);
              afterBulkAction();
            }}
            onDelete={async () => {
              await companiesApi.bulkDelete([...selectedIds]);
              afterBulkAction();
            }}
          />
        )}

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="flex gap-4 items-center py-2"><div className="skeleton h-8 w-8 rounded-full" /><div className="skeleton h-4 flex-1 max-w-[180px]" /><div className="skeleton h-4 flex-1 max-w-[160px]" /><div className="skeleton h-4 flex-1 max-w-[140px]" /></div>)}</div>
          ) : companies.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Building2 className="h-8 w-8" /></div>
              <p className="empty-state-title">{customersOnly ? 'No customers yet' : 'No companies found'}</p>
              <p className="empty-state-desc">
                {customersOnly ? 'Companies show up here once one of their deals is marked Won.' : 'Add your first company to get started.'}
              </p>
              {!customersOnly && (
                <Can permission="companies.create"><Link href="/companies/new" className="btn-primary" id="create-first-company-btn"><Plus className="h-4 w-4" /> Add Company</Link></Can>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th className="w-10">
                    <input type="checkbox" checked={selectedIds.size === companies.length && companies.length > 0} onChange={toggleAll} aria-label="Select all companies" />
                  </th>
                  <th>Company</th>
                  {columns.map((key) => {
                    const field = fieldOf(key);
                    return <th key={key}>{field.label}</th>;
                  })}
                  {customersOnly && <th>Won deals</th>}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="table-row" onClick={rowNavigate(() => router.push(`/companies/${company.id}`))}>
                    <td>
                      <input type="checkbox" checked={selectedIds.has(company.id)} onChange={() => toggleOne(company.id)} aria-label={`Select ${company.name}`} />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar-sm text-[10px] bg-slate-100 text-slate-600">
                          <Building2 className="h-3.5 w-3.5" />
                        </div>
                        <Link href={`/companies/${company.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                          {company.name}
                        </Link>
                      </div>
                    </td>
                    {columns.map((key) => (
                      <td key={key}><CompanyCell company={company} columnKey={key} /></td>
                    ))}
                    {customersOnly && (
                      <td className="font-medium text-slate-800">
                        {(() => {
                          const wonDeals = (company as any).deals ?? [];
                          const total = wonDeals.reduce((sum: number, d: any) => sum + Number(d.value ?? 0), 0);
                          return `${wonDeals.length} · ${formatCurrency(total)}`;
                        })()}
                      </td>
                    )}
                    <td><button className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-surface-2"><MoreHorizontal className="h-4 w-4" /></button></td>
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
              <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} id="companies-prev">Previous</button>
              <button className="btn-secondary btn-sm" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)} id="companies-next">Next</button>
            </div>
          </div>
        )}
      </div>

      {importOpen && (
        <ImportDialog resource="companies" label="companies" onClose={() => setImportOpen(false)} />
      )}
    </div>
  );
}
