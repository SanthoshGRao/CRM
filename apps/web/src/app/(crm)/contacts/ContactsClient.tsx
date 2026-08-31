'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Search, Download, Upload, MoreHorizontal, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api/client';
import { contactsApi } from '@/lib/api/services';
import { Can } from '@/components/ui/Can';
import { formatDate, getInitials, rowNavigate } from '@/lib/utils';
import { FilterBuilder } from '@/components/views/FilterBuilder';
import { ColumnPicker } from '@/components/views/ColumnPicker';
import { SavedViewsBar } from '@/components/views/SavedViewsBar';
import { BulkActionBar } from '@/components/views/BulkActionBar';
import { fieldsFor, defaultColumns, type EntityFieldDef } from '@/lib/views/entityFields';
import type { Contact, FilterCondition, SavedView } from '@crm/types';
import { clsx } from 'clsx';
import { ImportDialog } from '@/components/import/ImportDialog';

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

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'blocked', label: 'Blocked' },
];

const FIELDS = fieldsFor('contact');

function fieldOf(key: string): EntityFieldDef {
  return FIELDS.find((f) => f.key === key) ?? FIELDS[0];
}

function ContactCell({ contact, columnKey }: { contact: any; columnKey: string }) {
  switch (columnKey) {
    case 'email':
      return <span className="text-slate-600">{contact.email ?? '—'}</span>;
    case 'phone':
      return <span className="text-slate-600">{contact.phone ?? contact.mobile ?? '—'}</span>;
    case 'companyId':
      return <span className="text-slate-600">{contact.company?.name ?? '—'}</span>;
    case 'ownerId':
      return contact.owner ? (
        <div className="flex items-center gap-2">
          <div className="avatar-sm text-[10px]">{getInitials(contact.owner.firstName, contact.owner.lastName)}</div>
          <span className="text-slate-600">{contact.owner.firstName}</span>
        </div>
      ) : <span className="text-slate-400">—</span>;
    case 'status':
      return <span className={clsx('badge', STATUS_CLASSES[contact.status] ?? 'badge-gray')}>{contact.status}</span>;
    case 'createdAt':
      return <span className="text-slate-500">{formatDate(contact.createdAt)}</span>;
    default:
      return null;
  }
}

export default function ContactsClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [customersOnly, setCustomersOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [columns, setColumns] = useState<string[]>(defaultColumns('contact'));
  const [activeView, setActiveView] = useState<SavedView | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtersParam = filters.length > 0 ? JSON.stringify(filters) : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', { search, page, customersOnly, filtersParam }],
    queryFn: () => fetchContacts({ search, filters: filtersParam, page, limit: 25, isCustomer: customersOnly ? 'true' : undefined }),
  });

  const contacts: Contact[] = data?.data ?? [];
  const pagination = data?.pagination;

  function applyView(view: SavedView | null) {
    setActiveView(view);
    setPage(1);
    if (!view) {
      setFilters([]);
      setColumns(defaultColumns('contact'));
      return;
    }
    setFilters(view.filters ?? []);
    setColumns(view.columns?.length ? view.columns : defaultColumns('contact'));
  }

  function toggleAll() {
    setSelectedIds((prev) => (prev.size === contacts.length ? new Set() : new Set(contacts.map((c) => c.id))));
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
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{customersOnly ? 'Customers' : 'Contacts'}</h1>
          {pagination && (
            <p className="text-sm text-slate-500 mt-0.5">
              {pagination.total.toLocaleString()} {customersOnly ? 'customers' : 'contacts'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary btn-sm" id="export-contacts-btn"><Download className="h-3.5 w-3.5" /> Export</button>
          <Can permission="contacts.create">
            <button className="btn-secondary btn-sm" id="import-contacts-btn" onClick={() => setImportOpen(true)}><Upload className="h-3.5 w-3.5" /> Import</button>
          </Can>
          <Can permission="contacts.create"><Link href="/contacts/new" className="btn-primary btn-sm" id="create-contact-btn"><Plus className="h-3.5 w-3.5" /> Add Contact</Link></Can>
        </div>
      </div>

      <div className="card">
        <SavedViewsBar
          entityType="contact"
          entityLabel="contacts"
          activeView={activeView}
          current={{ filters, columns }}
          onSelect={applyView}
        />

        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search contacts..." className="input pl-9" id="contacts-search" value={search} onChange={(e) => { setSearch((e.target as HTMLInputElement).value); setPage(1); }} />
          </div>
          <FilterBuilder entityType="contact" value={filters} onChange={(f) => { setFilters(f); setPage(1); }} />
          <ColumnPicker entityType="contact" value={columns} onChange={setColumns} />
          <button
            type="button"
            className={clsx('btn-sm flex items-center gap-1.5', customersOnly ? 'btn-primary' : 'btn-secondary')}
            id="contacts-customers-only-toggle"
            onClick={() => { setCustomersOnly((v) => !v); setPage(1); }}
            title="Show only contacts with at least one won deal"
          >
            <BadgeCheck className="h-3.5 w-3.5" /> Customers only
          </button>
        </div>

        {selectedIds.size > 0 && (
          <BulkActionBar
            count={selectedIds.size}
            entityLabelPlural="contacts"
            statusOptions={STATUS_OPTIONS}
            onClear={() => setSelectedIds(new Set())}
            onUpdate={async (updates) => {
              await contactsApi.bulkUpdate([...selectedIds], updates);
              afterBulkAction();
            }}
            onDelete={async () => {
              await contactsApi.bulkDelete([...selectedIds]);
              afterBulkAction();
            }}
          />
        )}

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="flex gap-4 items-center py-2"><div className="skeleton h-8 w-8 rounded-full" /><div className="skeleton h-4 flex-1 max-w-[180px]" /><div className="skeleton h-4 flex-1 max-w-[160px]" /><div className="skeleton h-4 flex-1 max-w-[140px]" /></div>)}</div>
          ) : contacts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Search className="h-8 w-8" /></div>
              <p className="empty-state-title">{customersOnly ? 'No customers yet' : 'No contacts found'}</p>
              <p className="empty-state-desc">
                {customersOnly ? 'Contacts show up here once one of their deals is marked Won.' : 'Add your first contact to get started.'}
              </p>
              {!customersOnly && (
                <Can permission="contacts.create"><Link href="/contacts/new" className="btn-primary" id="create-first-contact-btn"><Plus className="h-4 w-4" /> Add Contact</Link></Can>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th className="w-10">
                    <input type="checkbox" checked={selectedIds.size === contacts.length && contacts.length > 0} onChange={toggleAll} aria-label="Select all contacts" />
                  </th>
                  <th>Name</th>
                  {columns.map((key) => {
                    const field = fieldOf(key);
                    return <th key={key}>{field.label}</th>;
                  })}
                  {customersOnly && <th>Won deals</th>}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="table-row" onClick={rowNavigate(() => router.push(`/contacts/${contact.id}`))}>
                    <td>
                      <input type="checkbox" checked={selectedIds.has(contact.id)} onChange={() => toggleOne(contact.id)} aria-label={`Select ${contact.firstName}`} />
                    </td>
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
                    {columns.map((key) => (
                      <td key={key}><ContactCell contact={contact} columnKey={key} /></td>
                    ))}
                    {customersOnly && (
                      <td className="font-medium text-slate-800">{((contact as any).deals ?? []).length}</td>
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
              <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} id="contacts-prev">Previous</button>
              <button className="btn-secondary btn-sm" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)} id="contacts-next">Next</button>
            </div>
          </div>
        )}
      </div>

      {importOpen && (
        <ImportDialog resource="contacts" label="contacts" onClose={() => setImportOpen(false)} />
      )}
    </div>
  );
}
