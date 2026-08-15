'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Download, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api/client';
import { Can } from '@/components/ui/Can';
import { formatDate, getInitials } from '@/lib/utils';
import type { Contact } from '@crm/types';
import { clsx } from 'clsx';

async function fetchContacts(params: Record<string, any>) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  ).toString();
  const { data } = await api.get(`/contacts?${query}`);
  return data;
}

const STATUS_CLASSES: Record<string, string> = {
  active: 'badge-green', inactive: 'badge-gray', blocked: 'badge-red',
};

export default function ContactsClient() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', { search, page }],
    queryFn: () => fetchContacts({ search, page, limit: 25 }),
  });

  const contacts: Contact[] = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Contacts</h1>
          {pagination && <p className="text-sm text-slate-500 mt-0.5">{pagination.total.toLocaleString()} contacts</p>}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary btn-sm" id="export-contacts-btn"><Download className="h-3.5 w-3.5" /> Export</button>
          <Can permission="contacts.create"><Link href="/contacts/new" className="btn-primary btn-sm" id="create-contact-btn"><Plus className="h-3.5 w-3.5" /> Add Contact</Link></Can>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 p-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search contacts..." className="input pl-9" id="contacts-search" value={search} onChange={(e) => { setSearch((e.target as HTMLInputElement).value); setPage(1); }} />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="flex gap-4 items-center py-2"><div className="skeleton h-8 w-8 rounded-full" /><div className="skeleton h-4 flex-1 max-w-[180px]" /><div className="skeleton h-4 flex-1 max-w-[160px]" /><div className="skeleton h-4 flex-1 max-w-[140px]" /></div>)}</div>
          ) : contacts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Search className="h-8 w-8" /></div>
              <p className="empty-state-title">No contacts found</p>
              <p className="empty-state-desc">Add your first contact to get started.</p>
              <Can permission="contacts.create"><Link href="/contacts/new" className="btn-primary" id="create-first-contact-btn"><Plus className="h-4 w-4" /> Add Contact</Link></Can>
            </div>
          ) : (
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Owner</th><th>Status</th><th>Created</th><th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="table-row">
                    <td>
                      <div className="flex items-center gap-3">
                        {contact.avatarUrl ? (
                          <img src={contact.avatarUrl} className="avatar-sm" alt="" />
                        ) : (
                          <div className="avatar-sm text-[10px]">{getInitials(contact.firstName, contact.lastName)}</div>
                        )}
                        <Link href={`/contacts/${contact.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                          {contact.firstName} {contact.lastName}
                        </Link>
                      </div>
                    </td>
                    <td className="text-slate-600">{contact.email ?? '—'}</td>
                    <td className="text-slate-600">{contact.phone ?? contact.mobile ?? '—'}</td>
                    <td className="text-slate-600">{(contact as any).company?.name ?? '—'}</td>
                    <td>
                      {(contact as any).owner ? (
                        <div className="flex items-center gap-2">
                          <div className="avatar-sm text-[10px]">{getInitials((contact as any).owner.firstName, (contact as any).owner.lastName)}</div>
                          <span className="text-slate-600">{(contact as any).owner.firstName}</span>
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td><span className={clsx('badge', STATUS_CLASSES[contact.status] ?? 'badge-gray')}>{contact.status}</span></td>
                    <td className="text-slate-500">{formatDate(contact.createdAt)}</td>
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
              <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} id="contacts-prev">Previous</button>
              <button className="btn-secondary btn-sm" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)} id="contacts-next">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
