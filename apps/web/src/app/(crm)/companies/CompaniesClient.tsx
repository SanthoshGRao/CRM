'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Download, MoreHorizontal, Building2 } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api/client';
import { Can } from '@/components/ui/Can';
import { formatDate, formatCurrency, getInitials } from '@/lib/utils';
import type { Company } from '@crm/types';
import { clsx } from 'clsx';

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

export default function CompaniesClient() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['companies', { search, page }],
    queryFn: () => fetchCompanies({ search, page, limit: 25 }),
    placeholderData: (prev) => prev,
  });

  const companies: Company[] = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Companies</h1>
          {pagination && <p className="text-sm text-slate-500 mt-0.5">{pagination.total.toLocaleString()} companies</p>}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary btn-sm" id="export-companies-btn"><Download className="h-3.5 w-3.5" /> Export</button>
          <Can permission="companies.create"><Link href="/companies/new" className="btn-primary btn-sm" id="create-company-btn"><Plus className="h-3.5 w-3.5" /> Add Company</Link></Can>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 p-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search companies..." className="input pl-9" id="companies-search" value={search} onChange={(e) => { setSearch((e.target as HTMLInputElement).value); setPage(1); }} />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="flex gap-4 items-center py-2"><div className="skeleton h-8 w-8 rounded-full" /><div className="skeleton h-4 flex-1 max-w-[180px]" /><div className="skeleton h-4 flex-1 max-w-[160px]" /><div className="skeleton h-4 flex-1 max-w-[140px]" /></div>)}</div>
          ) : companies.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Building2 className="h-8 w-8" /></div>
              <p className="empty-state-title">No companies found</p>
              <p className="empty-state-desc">Add your first company to get started.</p>
              <Can permission="companies.create"><Link href="/companies/new" className="btn-primary" id="create-first-company-btn"><Plus className="h-4 w-4" /> Add Company</Link></Can>
            </div>
          ) : (
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th>Company</th><th>Industry</th><th>Phone</th><th>Employees</th><th>Revenue</th><th>Owner</th><th>Status</th><th>Created</th><th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="table-row">
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
                    <td className="text-slate-600">{company.industry ?? '—'}</td>
                    <td className="text-slate-600">{company.phone ?? '—'}</td>
                    <td className="text-slate-600">{company.employees ?? '—'}</td>
                    <td className="font-medium text-slate-800">{company.annualRevenue != null ? formatCurrency(Number(company.annualRevenue)) : '—'}</td>
                    <td>
                      {(company as any).owner ? (
                        <div className="flex items-center gap-2">
                          <div className="avatar-sm text-[10px]">{getInitials((company as any).owner.firstName, (company as any).owner.lastName)}</div>
                          <span className="text-slate-600">{(company as any).owner.firstName}</span>
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td><span className={clsx('badge', STATUS_CLASSES[company.status] ?? 'badge-gray')}>{company.status}</span></td>
                    <td className="text-slate-500">{formatDate(company.createdAt)}</td>
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
    </div>
  );
}
