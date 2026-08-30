'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Loader2, CheckCircle2, Circle } from 'lucide-react';
import { clsx } from 'clsx';
import { tasksApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDate, getInitials } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Can } from '@/components/ui/Can';
import { DetailRow, ErrorBanner } from '@/components/ui/Field';
import { CustomFieldSummary } from '@/components/ui/CustomFieldInputs';
import { TaskForm, toTaskFormValues } from '../TaskForm';

const PRIORITY_CLASSES: Record<string, string> = {
  low: 'badge-gray', medium: 'badge-blue', high: 'badge-yellow', urgent: 'badge-red',
};

const STATUS_CLASSES: Record<string, string> = {
  pending: 'badge-gray', in_progress: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red',
};

export default function TaskDetailClient({ taskId }: { taskId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: task, isLoading, isError, error } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.get(taskId),
  });

  const toggleComplete = useMutation({
    mutationFn: (done: boolean) => tasksApi.update(taskId, { status: done ? 'completed' : 'pending' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: () => tasksApi.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      router.push('/tasks');
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="skeleton h-8 w-56" />
        <div className="skeleton h-64 max-w-2xl" />
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="page-container">
        <PageHeader title="Task" backHref="/tasks" backLabel="Back to tasks" />
        <ErrorBanner message={getErrorMessage(error, 'This task could not be found.')} />
      </div>
    );
  }

  const t = task as any;
  const done = t.status === 'completed';

  if (isEditing) {
    return (
      <div className="page-container">
        <PageHeader title={`Edit ${t.title}`} backHref={`/tasks/${taskId}`} backLabel="Back to task" />
        <div className="max-w-3xl">
          <TaskForm
            taskId={taskId}
            initialValues={toTaskFormValues(t)}
            initialCustomValues={t.customFieldValues ?? []}
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
        title={t.title}
        subtitle={t.dueDate ? `Due ${formatDate(t.dueDate)}` : 'No due date'}
        backHref="/tasks"
        backLabel="Back to tasks"
        actions={
          <>
            <button
              className="btn-secondary btn-sm"
              id="toggle-task-btn"
              disabled={toggleComplete.isPending}
              onClick={() => toggleComplete.mutate(!done)}
            >
              {done ? <Circle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {done ? 'Reopen' : 'Mark complete'}
            </button>
            <Can permission="tasks.update">
              <button className="btn-secondary btn-sm" id="edit-task-btn" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            </Can>
            <Can permission="tasks.delete">
              <button
              className="btn-danger btn-sm"
              id="delete-task-btn"
              disabled={remove.isPending}
              onClick={() => { if (window.confirm(`Delete "${t.title}"?`)) remove.mutate(); }}
            >
              {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
            </Can>
          </>
        }
      />

      <ErrorBanner message={actionError} />

      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-body">
            <div className="flex flex-wrap items-center gap-2">
              <span className={clsx('badge', STATUS_CLASSES[t.status] ?? 'badge-gray')}>
                {String(t.status).replace('_', ' ')}
              </span>
              <span className={clsx('badge', PRIORITY_CLASSES[t.priority] ?? 'badge-gray')}>{t.priority}</span>
            </div>

            <div className="mt-4 divide-y divide-slate-100 border-t pt-2">
              <DetailRow label="Due date">{t.dueDate ? formatDate(t.dueDate) : '—'}</DetailRow>
              <DetailRow label="Assignee">
                {t.assignedTo ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="avatar-sm text-[10px]">{getInitials(t.assignedTo.firstName, t.assignedTo.lastName)}</span>
                    {t.assignedTo.firstName} {t.assignedTo.lastName}
                  </span>
                ) : 'Unassigned'}
              </DetailRow>
              <DetailRow label="Created by">
                {t.createdBy ? `${t.createdBy.firstName} ${t.createdBy.lastName}` : '—'}
              </DetailRow>
              <DetailRow label="Related lead">
                {t.lead ? <Link href={`/leads/${t.lead.id}`} className="text-brand-600 hover:underline">{t.lead.title}</Link> : '—'}
              </DetailRow>
              <DetailRow label="Related deal">
                {t.deal ? <Link href={`/deals/${t.deal.id}`} className="text-brand-600 hover:underline">{t.deal.name}</Link> : '—'}
              </DetailRow>
              <DetailRow label="Completed at">{t.completedAt ? formatDate(t.completedAt) : '—'}</DetailRow>
              <DetailRow label="Created">{formatDate(t.createdAt)}</DetailRow>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Description</h3></div>
          <div className="card-body">
            {t.description ? (
              <p className="whitespace-pre-wrap text-sm text-slate-700">{t.description}</p>
            ) : (
              <p className="text-sm text-slate-400">No description.</p>
            )}
          </div>
        </div>

        <CustomFieldSummary values={t.customFieldValues} />
      </div>
    </div>
  );
}
