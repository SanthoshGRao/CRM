'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Loader2, ArrowRightLeft, ExternalLink } from 'lucide-react';
import { leadsApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Can } from '@/components/ui/Can';
import { usePermissions } from '@/lib/permissions';
import { DetailRow, ErrorBanner } from '@/components/ui/Field';
import { InlineEditRow } from '@/components/detail/InlineEditRow';
import { ActivityTimeline } from '@/components/detail/ActivityTimeline';
import { RelatedList } from '@/components/detail/RelatedList';
import { CustomFieldSummary } from '@/components/ui/CustomFieldInputs';
import { fieldsFor } from '@/lib/views/entityFields';
import { LeadForm, toLeadFormValues } from '../LeadForm';
import { ConvertLeadDialog } from '../ConvertLeadDialog';

const STATUS_CLASSES: Record<string, string> = {
  new: 'badge-blue', working: 'badge-yellow', qualified: 'badge-purple',
  unqualified: 'badge-gray', converted: 'badge-green', lost: 'badge-red',
};

const SOURCE_OPTIONS = fieldsFor('lead').find((f) => f.key === 'source')?.options ?? [];

export default function LeadDetailClient({ leadId }: { leadId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [isEditing, setIsEditing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: lead, isLoading, isError, error } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => leadsApi.get(leadId),
  });

  const remove = useMutation({
    mutationFn: () => leadsApi.delete(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      router.push('/leads');
    },
    onError: (err) => setDeleteError(getErrorMessage(err)),
  });

  const updateField = useMutation({
    mutationFn: (data: Record<string, unknown>) => leadsApi.update(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
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

  if (isError || !lead) {
    return (
      <div className="page-container">
        <PageHeader title="Lead" backHref="/leads" backLabel="Back to leads" />
        <ErrorBanner message={getErrorMessage(error, 'This lead could not be found.')} />
      </div>
    );
  }

  const l = lead as any;

  if (isEditing) {
    return (
      <div className="page-container">
        <PageHeader title={`Edit ${l.title}`} backHref={`/leads/${leadId}`} backLabel="Back to lead" />
        <div className="max-w-3xl">
          <LeadForm
            leadId={leadId}
            initialValues={toLeadFormValues(l)}
            initialCustomValues={l.customFieldValues ?? []}
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
        title={l.title}
        subtitle={l.pipeline?.name ? `${l.pipeline.name} · ${l.stage?.name ?? 'No stage'}` : undefined}
        backHref="/leads"
        backLabel="Back to leads"
        actions={
          <>
            {l.convertedDealId ? (
              <Link href={`/deals/${l.convertedDealId}`} className="btn-secondary btn-sm" id="view-converted-deal-btn">
                <ExternalLink className="h-3.5 w-3.5" /> View deal
              </Link>
            ) : (
              <Can permission="leads.update">
                <Can permission="deals.create">
                  <button
                    className="btn-primary btn-sm"
                    id="convert-lead-btn"
                    onClick={() => setIsConverting(true)}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Convert to Deal
                  </button>
                </Can>
              </Can>
            )}
            <Can permission="leads.update">
              <button className="btn-secondary btn-sm" id="edit-lead-btn" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            </Can>
            <Can permission="leads.delete">
              <button
              className="btn-danger btn-sm"
              id="delete-lead-btn"
              disabled={remove.isPending}
              onClick={() => { if (window.confirm(`Delete "${l.title}"?`)) remove.mutate(); }}
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
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${STATUS_CLASSES[l.status] ?? 'badge-gray'}`}>{l.status}</span>
                {l.stage && (
                  <span className="badge badge-gray" style={{ backgroundColor: `${l.stage.color}22`, color: l.stage.color }}>
                    {l.stage.name}
                  </span>
                )}
              </div>

              <div className="mt-4 divide-y divide-slate-100 border-t pt-2">
                <InlineEditRow
                  label="Value"
                  type="number"
                  value={l.value}
                  display={l.value != null ? formatCurrency(Number(l.value)) : undefined}
                  editable={can('leads.update')}
                  onSave={(v) => updateField.mutateAsync({ value: v == null ? null : Number(v) })}
                />
                <InlineEditRow
                  label="Probability"
                  type="number"
                  value={l.probability}
                  display={l.probability != null ? `${l.probability}%` : undefined}
                  editable={can('leads.update')}
                  onSave={(v) => updateField.mutateAsync({ probability: v == null ? null : Number(v) })}
                />
                <InlineEditRow
                  label="Source"
                  type="select"
                  options={SOURCE_OPTIONS}
                  value={l.source}
                  display={l.source ? String(l.source).replace(/_/g, ' ') : undefined}
                  editable={can('leads.update')}
                  onSave={(v) => updateField.mutateAsync({ source: v || null })}
                />
                <InlineEditRow
                  label="Expected close"
                  type="date"
                  value={l.expectedCloseDate}
                  display={l.expectedCloseDate ? formatDate(l.expectedCloseDate) : undefined}
                  editable={can('leads.update')}
                  onSave={(v) => updateField.mutateAsync({ expectedCloseDate: v })}
                />
                <InlineEditRow
                  label="Contact"
                  type="record"
                  recordSource="contacts"
                  value={l.contact?.id}
                  display={l.contact ? (
                    <Link href={`/contacts/${l.contact.id}`} className="text-brand-600 hover:underline">
                      {l.contact.firstName} {l.contact.lastName}
                    </Link>
                  ) : undefined}
                  editable={can('leads.update')}
                  onSave={(v) => updateField.mutateAsync({ contactId: v || null })}
                />
                <InlineEditRow
                  label="Company"
                  type="record"
                  recordSource="companies"
                  value={l.company?.id}
                  display={l.company ? (
                    <Link href={`/companies/${l.company.id}`} className="text-brand-600 hover:underline">
                      {l.company.name}
                    </Link>
                  ) : undefined}
                  editable={can('leads.update')}
                  onSave={(v) => updateField.mutateAsync({ companyId: v || null })}
                />
                <InlineEditRow
                  label="Owner"
                  type="record"
                  recordSource="users"
                  value={l.owner?.id}
                  display={l.owner ? `${l.owner.firstName} ${l.owner.lastName}` : undefined}
                  editable={can('leads.update')}
                  onSave={(v) => updateField.mutateAsync({ ownerId: v || null })}
                />
                {l.convertedDealId && (
                  <DetailRow label="Converted">
                    <Link href={`/deals/${l.convertedDealId}`} className="text-brand-600 hover:underline">
                      {l.convertedDeal?.name ?? 'View deal'}
                    </Link>
                    {l.convertedAt && (
                      <span className="ml-1 text-xs text-slate-400">· {formatDate(l.convertedAt)}</span>
                    )}
                  </DetailRow>
                )}
                <DetailRow label="Created">{formatDate(l.createdAt)}</DetailRow>
              </div>
            </div>
          </div>

          <CustomFieldSummary values={l.customFieldValues} />

          <RelatedList
            title="Open tasks"
            emptyLabel="No open tasks"
            items={(l.tasks ?? []).map((t: any) => ({
              id: t.id,
              href: `/tasks/${t.id}`,
              label: t.title,
              meta: t.dueDate ? formatDate(t.dueDate) : t.priority,
            }))}
            action={
              <Link href={`/tasks/new?leadId=${leadId}`} className="text-xs font-medium text-brand-600 hover:underline">
                Add task
              </Link>
            }
          />
        </div>

        <div className="lg:col-span-2">
          <ActivityTimeline
            activities={l.activities ?? []}
            relatedType="lead"
            relatedId={leadId}
            invalidateKey={['lead', leadId]}
          />
        </div>
      </div>

      {isConverting && (
        <ConvertLeadDialog lead={l} onClose={() => setIsConverting(false)} />
      )}
    </div>
  );
}
