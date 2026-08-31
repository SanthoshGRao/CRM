'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Loader2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { dealsApi } from '@/lib/api/services';
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
import { DealForm, toDealFormValues } from '../DealForm';

const STATUS_CLASSES: Record<string, string> = {
  open: 'badge-blue', won: 'badge-green', lost: 'badge-red',
};

export default function DealDetailClient({ dealId }: { dealId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const { data: deal, isLoading, isError, error } = useQuery({
    queryKey: ['deal', dealId],
    queryFn: () => dealsApi.get(dealId),
  });

  const remove = useMutation({
    mutationFn: () => dealsApi.remove(dealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      router.push('/deals');
    },
    onError: (err) => setDeleteError(getErrorMessage(err)),
  });

  const setStatus = useMutation({
    mutationFn: (status: 'open' | 'won' | 'lost') => dealsApi.update(dealId, { status }),
    onMutate: () => setStatusError(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
    onError: (err) => setStatusError(getErrorMessage(err)),
  });

  const updateField = useMutation({
    mutationFn: (data: Record<string, unknown>) => dealsApi.update(dealId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
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

  if (isError || !deal) {
    return (
      <div className="page-container">
        <PageHeader title="Deal" backHref="/deals" backLabel="Back to deals" />
        <ErrorBanner message={getErrorMessage(error, 'This deal could not be found.')} />
      </div>
    );
  }

  const d = deal as any;

  if (isEditing) {
    return (
      <div className="page-container">
        <PageHeader title={`Edit ${d.name}`} backHref={`/deals/${dealId}`} backLabel="Back to deal" />
        <div className="max-w-3xl">
          <DealForm
            dealId={dealId}
            initialValues={toDealFormValues(d)}
            initialCustomValues={d.customFieldValues ?? []}
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
        title={d.name}
        subtitle={d.pipeline?.name ? `${d.pipeline.name} · ${d.stage?.name ?? 'No stage'}` : undefined}
        backHref="/deals"
        backLabel="Back to deals"
        actions={
          <>
            <Can permission="deals.update">
              <button className="btn-secondary btn-sm" id="edit-deal-btn" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            </Can>
            <Can permission="deals.delete">
              <button
              className="btn-danger btn-sm"
              id="delete-deal-btn"
              disabled={remove.isPending}
              onClick={() => { if (window.confirm(`Delete "${d.name}"?`)) remove.mutate(); }}
            >
              {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
            </Can>
          </>
        }
      />

      <ErrorBanner message={deleteError} />
      <ErrorBanner message={statusError} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="card">
            <div className="card-body">
              <p className="text-3xl font-bold text-slate-900">
                {d.value != null ? formatCurrency(Number(d.value)) : '—'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`badge ${STATUS_CLASSES[d.status] ?? 'badge-gray'}`}>{d.status}</span>
                {d.stage && (
                  <span className="badge" style={{ backgroundColor: `${d.stage.color}22`, color: d.stage.color }}>
                    {d.stage.name}
                  </span>
                )}
              </div>

              <Can permission="deals.update">
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {d.status !== 'won' && (
                    <button
                      className="btn-secondary btn-sm"
                      id="mark-deal-won-btn"
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate('won')}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Mark as Won
                    </button>
                  )}
                  {d.status !== 'lost' && (
                    <button
                      className="btn-secondary btn-sm"
                      id="mark-deal-lost-btn"
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate('lost')}
                    >
                      <XCircle className="h-3.5 w-3.5 text-red-600" /> Mark as Lost
                    </button>
                  )}
                  {d.status !== 'open' && (
                    <button
                      className="btn-secondary btn-sm"
                      id="reopen-deal-btn"
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate('open')}
                    >
                      {setStatus.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Reopen
                    </button>
                  )}
                </div>
              </Can>

              <div className="mt-4 divide-y divide-slate-100 border-t pt-2">
                <InlineEditRow
                  label="Probability"
                  type="number"
                  value={d.probability}
                  display={d.probability != null ? `${d.probability}%` : undefined}
                  editable={can('deals.update')}
                  onSave={(v) => updateField.mutateAsync({ probability: v == null ? null : Number(v) })}
                />
                <InlineEditRow
                  label="Expected close"
                  type="date"
                  value={d.expectedCloseDate}
                  display={d.expectedCloseDate ? formatDate(d.expectedCloseDate) : undefined}
                  editable={can('deals.update')}
                  onSave={(v) => updateField.mutateAsync({ expectedCloseDate: v })}
                />
                <DetailRow label="Closed at">{d.closedAt ? formatDate(d.closedAt) : '—'}</DetailRow>
                <InlineEditRow
                  label="Contact"
                  type="record"
                  recordSource="contacts"
                  value={d.contact?.id}
                  display={d.contact ? (
                    <Link href={`/contacts/${d.contact.id}`} className="text-brand-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                      {d.contact.firstName} {d.contact.lastName}
                    </Link>
                  ) : undefined}
                  editable={can('deals.update')}
                  onSave={(v) => updateField.mutateAsync({ contactId: v || null })}
                />
                <InlineEditRow
                  label="Company"
                  type="record"
                  recordSource="companies"
                  value={d.company?.id}
                  display={d.company ? (
                    <Link href={`/companies/${d.company.id}`} className="text-brand-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                      {d.company.name}
                    </Link>
                  ) : undefined}
                  editable={can('deals.update')}
                  onSave={(v) => updateField.mutateAsync({ companyId: v || null })}
                />
                <InlineEditRow
                  label="Owner"
                  type="record"
                  recordSource="users"
                  value={d.owner?.id}
                  display={d.owner ? `${d.owner.firstName} ${d.owner.lastName}` : undefined}
                  editable={can('deals.update')}
                  onSave={(v) => updateField.mutateAsync({ ownerId: v || null })}
                />
                <DetailRow label="Created">{formatDate(d.createdAt)}</DetailRow>
              </div>
            </div>
          </div>

          <CustomFieldSummary values={d.customFieldValues} />

          <RelatedList
            title="Open tasks"
            emptyLabel="No open tasks"
            items={(d.tasks ?? []).map((t: any) => ({
              id: t.id,
              href: `/tasks/${t.id}`,
              label: t.title,
              meta: t.dueDate ? formatDate(t.dueDate) : t.priority,
            }))}
            action={
              <Link href={`/tasks/new?dealId=${dealId}`} className="text-xs font-medium text-brand-600 hover:underline">
                Add task
              </Link>
            }
          />
        </div>

        <div className="lg:col-span-2">
          <ActivityTimeline
            activities={d.activities ?? []}
            relatedType="deal"
            relatedId={dealId}
            invalidateKey={['deal', dealId]}
          />
        </div>
      </div>
    </div>
  );
}
