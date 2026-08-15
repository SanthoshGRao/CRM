'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { dealsApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Can } from '@/components/ui/Can';
import { DetailRow, ErrorBanner } from '@/components/ui/Field';
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
  const [isEditing, setIsEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

              <div className="mt-4 divide-y divide-slate-100 border-t pt-2">
                <DetailRow label="Probability">{d.probability != null ? `${d.probability}%` : '—'}</DetailRow>
                <DetailRow label="Expected close">{d.expectedCloseDate ? formatDate(d.expectedCloseDate) : '—'}</DetailRow>
                <DetailRow label="Closed at">{d.closedAt ? formatDate(d.closedAt) : '—'}</DetailRow>
                <DetailRow label="Contact">
                  {d.contact ? (
                    <Link href={`/contacts/${d.contact.id}`} className="text-brand-600 hover:underline">
                      {d.contact.firstName} {d.contact.lastName}
                    </Link>
                  ) : '—'}
                </DetailRow>
                <DetailRow label="Company">
                  {d.company ? (
                    <Link href={`/companies/${d.company.id}`} className="text-brand-600 hover:underline">
                      {d.company.name}
                    </Link>
                  ) : '—'}
                </DetailRow>
                <DetailRow label="Owner">
                  {d.owner ? `${d.owner.firstName} ${d.owner.lastName}` : 'Unassigned'}
                </DetailRow>
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
