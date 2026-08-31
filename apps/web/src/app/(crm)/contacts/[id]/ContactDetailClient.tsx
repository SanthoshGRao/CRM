'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Loader2, Mail, Phone, Smartphone } from 'lucide-react';
import { contactsApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Can } from '@/components/ui/Can';
import { usePermissions } from '@/lib/permissions';
import { DetailRow, ErrorBanner } from '@/components/ui/Field';
import { InlineEditRow } from '@/components/detail/InlineEditRow';
import { ActivityTimeline } from '@/components/detail/ActivityTimeline';
import { RelatedList } from '@/components/detail/RelatedList';
import { CustomFieldSummary } from '@/components/ui/CustomFieldInputs';
import { ContactForm, toContactFormValues } from '../ContactForm';

export default function ContactDetailClient({ contactId }: { contactId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: contact, isLoading, isError, error } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => contactsApi.get(contactId),
  });

  const remove = useMutation({
    mutationFn: () => contactsApi.delete(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      router.push('/contacts');
    },
    onError: (err) => setDeleteError(getErrorMessage(err)),
  });

  const updateField = useMutation({
    mutationFn: (data: Record<string, unknown>) => contactsApi.update(contactId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="skeleton h-8 w-56" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="skeleton h-64 lg:col-span-1" />
          <div className="skeleton h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (isError || !contact) {
    return (
      <div className="page-container">
        <PageHeader title="Contact" backHref="/contacts" backLabel="Back to contacts" />
        <ErrorBanner message={getErrorMessage(error, 'This contact could not be found.')} />
      </div>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`;

  if (isEditing) {
    return (
      <div className="page-container">
        <PageHeader title={`Edit ${fullName}`} backHref={`/contacts/${contactId}`} backLabel="Back to contact" />
        <div className="max-w-3xl">
          <ContactForm
            contactId={contactId}
            initialValues={toContactFormValues(contact)}
            initialCustomValues={contact.customFieldValues ?? []}
            onCancel={() => setIsEditing(false)}
            onSaved={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={fullName}
        subtitle={contact.company?.name ?? 'No company'}
        backHref="/contacts"
        backLabel="Back to contacts"
        actions={
          <>
            <Can permission="contacts.update">
              <button className="btn-secondary btn-sm" id="edit-contact-btn" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            </Can>
            <Can permission="contacts.delete">
              <button
              className="btn-danger btn-sm"
              id="delete-contact-btn"
              disabled={remove.isPending}
              onClick={() => { if (window.confirm(`Delete ${fullName}?`)) remove.mutate(); }}
            >
              {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
            </Can>
          </>
        }
      />

      <ErrorBanner message={deleteError} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <div className="avatar-lg">{getInitials(contact.firstName, contact.lastName)}</div>
                <div>
                  <p className="font-semibold text-slate-900">{fullName}</p>
                  <span className={`badge ${contact.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                    {contact.status}
                  </span>
                </div>
              </div>

              <div className="mt-4 divide-y divide-slate-100 border-t pt-2">
                <InlineEditRow
                  label="Email"
                  type="text"
                  value={contact.email}
                  display={contact.email ? (
                    <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                      <Mail className="h-3.5 w-3.5" /> {contact.email}
                    </a>
                  ) : undefined}
                  editable={can('contacts.update')}
                  onSave={(v) => updateField.mutateAsync({ email: v })}
                />
                <InlineEditRow
                  label="Phone"
                  type="text"
                  value={contact.phone}
                  display={contact.phone ? (
                    <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                      <Phone className="h-3.5 w-3.5" /> {contact.phone}
                    </a>
                  ) : undefined}
                  editable={can('contacts.update')}
                  onSave={(v) => updateField.mutateAsync({ phone: v })}
                />
                <InlineEditRow
                  label="Mobile"
                  type="text"
                  value={contact.mobile}
                  display={contact.mobile ? (
                    <a href={`tel:${contact.mobile}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                      <Smartphone className="h-3.5 w-3.5" /> {contact.mobile}
                    </a>
                  ) : undefined}
                  editable={can('contacts.update')}
                  onSave={(v) => updateField.mutateAsync({ mobile: v })}
                />
                <InlineEditRow
                  label="Company"
                  type="record"
                  recordSource="companies"
                  value={contact.company?.id}
                  display={contact.company ? (
                    <Link href={`/companies/${contact.company.id}`} className="text-brand-600 hover:underline">
                      {contact.company.name}
                    </Link>
                  ) : undefined}
                  editable={can('contacts.update')}
                  onSave={(v) => updateField.mutateAsync({ companyId: v || null })}
                />
                <InlineEditRow
                  label="Owner"
                  type="record"
                  recordSource="users"
                  value={contact.owner?.id}
                  display={contact.owner ? `${contact.owner.firstName} ${contact.owner.lastName}` : undefined}
                  editable={can('contacts.update')}
                  onSave={(v) => updateField.mutateAsync({ ownerId: v || null })}
                />
                <DetailRow label="Tags">
                  {Array.isArray(contact.tags) && contact.tags.length > 0 ? (
                    <span className="flex flex-wrap justify-end gap-1">
                      {contact.tags.map((t: string) => <span key={t} className="badge badge-blue">{t}</span>)}
                    </span>
                  ) : '—'}
                </DetailRow>
                <DetailRow label="Created">{formatDate(contact.createdAt)}</DetailRow>
              </div>
            </div>
          </div>

          <CustomFieldSummary values={contact.customFieldValues} />

          <RelatedList
            title="Leads"
            emptyLabel="No leads linked"
            items={(contact.leads ?? []).map((l: any) => ({ id: l.id, href: `/leads/${l.id}`, label: l.title, meta: l.status }))}
          />
          <RelatedList
            title="Deals"
            emptyLabel="No deals linked"
            items={(contact.deals ?? []).map((d: any) => ({
              id: d.id, href: `/deals/${d.id}`, label: d.name,
              meta: d.value != null ? formatCurrency(Number(d.value)) : d.status,
            }))}
          />
        </div>

        <div className="lg:col-span-2">
          <ActivityTimeline
            activities={contact.activities ?? []}
            relatedType="contact"
            relatedId={contactId}
            invalidateKey={['contact', contactId]}
          />
        </div>
      </div>
    </div>
  );
}
