'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { tasksApi, leadsApi, dealsApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { Field, ErrorBanner } from '@/components/ui/Field';
import { RecordSelect } from '@/components/ui/RecordSelect';

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

export interface TaskFormValues {
  title: string;
  description: string;
  assignedToId: string;
  dueDate: string;
  priority: string;
  status: string;
  relatedLeadId: string;
  relatedDealId: string;
}

const EMPTY: TaskFormValues = {
  title: '', description: '', assignedToId: '', dueDate: '',
  priority: 'medium', status: 'pending', relatedLeadId: '', relatedDealId: '',
};

export function toTaskFormValues(task: any): TaskFormValues {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    assignedToId: task?.assignedToId ?? '',
    dueDate: task?.dueDate ? String(task.dueDate).slice(0, 10) : '',
    priority: task?.priority ?? 'medium',
    status: task?.status ?? 'pending',
    relatedLeadId: task?.relatedLeadId ?? '',
    relatedDealId: task?.relatedDealId ?? '',
  };
}

export function emptyTaskFormValues(overrides: Partial<TaskFormValues> = {}): TaskFormValues {
  return { ...EMPTY, ...overrides };
}

/** `status` is only accepted on update; create derives relatedType from the linked record. */
function toPayload(values: TaskFormValues, isUpdate: boolean) {
  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(values)) {
    if (value === '' || value == null) continue;
    if (key === 'status' && !isUpdate) continue;
    payload[key] = value;
  }

  if (values.relatedLeadId) payload.relatedType = 'lead';
  else if (values.relatedDealId) payload.relatedType = 'deal';

  return payload;
}

interface TaskFormProps {
  taskId?: string;
  initialValues?: TaskFormValues;
  onCancel?: () => void;
  onSaved?: (task: any) => void;
}

export function TaskForm({ taskId, initialValues, onCancel, onSaved }: TaskFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<TaskFormValues>(initialValues ?? EMPTY);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof TaskFormValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const { data: leadsData } = useQuery({
    queryKey: ['task-form-leads'],
    queryFn: () => leadsApi.list({ limit: 200 }),
    staleTime: 60_000,
  });
  const { data: dealsData } = useQuery({
    queryKey: ['task-form-deals'],
    queryFn: () => dealsApi.list({ limit: 200 }),
    staleTime: 60_000,
  });

  const leads = (leadsData as any)?.data ?? [];
  const deals = (dealsData as any)?.data ?? [];

  const save = useMutation({
    mutationFn: async () => {
      const payload = toPayload(values, Boolean(taskId));
      return taskId ? tasksApi.update(taskId, payload) : tasksApi.create(payload);
    },
    onSuccess: (task: any) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      if (onSaved) onSaved(task);
      else router.push(`/tasks/${task.id}`);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    save.mutate();
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-6">
      <ErrorBanner message={error} />

      <div className="card">
        <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Task details</h3></div>
        <div className="card-body grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="task-title" required className="sm:col-span-2">
            <input id="task-title" className="input" required maxLength={200} placeholder="Follow up on proposal"
              value={values.title} onChange={(e) => set('title')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Description" htmlFor="task-description" className="sm:col-span-2">
            <textarea id="task-description" className="input min-h-[90px]" placeholder="Add any context…"
              value={values.description} onChange={(e) => set('description')((e.target as HTMLTextAreaElement).value)} />
          </Field>

          <Field label="Assignee" htmlFor="task-assignee">
            <RecordSelect id="task-assignee" source="users" value={values.assignedToId} onChange={set('assignedToId')} placeholder="Unassigned" />
          </Field>

          <Field label="Due date" htmlFor="task-due">
            <input id="task-due" type="date" className="input"
              value={values.dueDate} onChange={(e) => set('dueDate')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Priority" htmlFor="task-priority">
            <select id="task-priority" className="input" value={values.priority}
              onChange={(e) => set('priority')((e.target as HTMLSelectElement).value)}>
              {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          {taskId && (
            <Field label="Status" htmlFor="task-status">
              <select id="task-status" className="input" value={values.status}
                onChange={(e) => set('status')((e.target as HTMLSelectElement).value)}>
                {TASK_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </Field>
          )}

          <Field label="Related lead" htmlFor="task-lead">
            <select id="task-lead" className="input" value={values.relatedLeadId}
              onChange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                setValues((prev) => ({ ...prev, relatedLeadId: v, relatedDealId: v ? '' : prev.relatedDealId }));
              }}>
              <option value="">None</option>
              {leads.map((l: any) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </Field>

          <Field label="Related deal" htmlFor="task-deal">
            <select id="task-deal" className="input" value={values.relatedDealId}
              onChange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                setValues((prev) => ({ ...prev, relatedDealId: v, relatedLeadId: v ? '' : prev.relatedLeadId }));
              }}>
              <option value="">None</option>
              {deals.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" className="btn-primary" id="save-task-btn" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {taskId ? 'Save changes' : 'Create task'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => (onCancel ? onCancel() : router.push('/tasks'))}>
          Cancel
        </button>
      </div>
    </form>
  );
}
