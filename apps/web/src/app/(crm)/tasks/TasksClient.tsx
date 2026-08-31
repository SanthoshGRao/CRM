'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Search, CheckSquare, Circle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';
import api from '@/lib/api/client';
import { tasksApi } from '@/lib/api/services';
import { Can } from '@/components/ui/Can';
import { formatDate, rowNavigate } from '@/lib/utils';
import { FilterBuilder } from '@/components/views/FilterBuilder';
import { ColumnPicker } from '@/components/views/ColumnPicker';
import { SavedViewsBar } from '@/components/views/SavedViewsBar';
import { BulkActionBar } from '@/components/views/BulkActionBar';
import { fieldsFor, defaultColumns, type EntityFieldDef } from '@/lib/views/entityFields';
import type { Task, FilterCondition, SavedView } from '@crm/types';

async function fetchTasks(params: Record<string, any>) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  ).toString();
  const { data } = await api.get(`/tasks?${query}`);
  return data;
}

const PRIORITY_CLASSES: Record<string, string> = {
  low: 'badge-gray', medium: 'badge-blue', high: 'badge-yellow', urgent: 'badge-red',
};

const STATUS_CLASSES: Record<string, string> = {
  pending: 'badge-gray', in_progress: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red',
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const FIELDS = fieldsFor('task');

function fieldOf(key: string): EntityFieldDef {
  return FIELDS.find((f) => f.key === key) ?? FIELDS[0];
}

function isOverdue(task: Task) {
  return task.dueDate && task.status !== 'completed' && task.status !== 'cancelled' && new Date(task.dueDate) < new Date();
}

function TaskCell({ task, columnKey }: { task: any; columnKey: string }) {
  switch (columnKey) {
    case 'priority':
      return <span className={clsx('badge', PRIORITY_CLASSES[task.priority] ?? 'badge-gray')}>{task.priority}</span>;
    case 'status':
      return <span className={clsx('badge', STATUS_CLASSES[task.status] ?? 'badge-gray')}>{task.status.replace('_', ' ')}</span>;
    case 'assignedToId':
      return task.assignedTo ? (
        <div className="flex items-center gap-2">
          <div className="avatar-sm text-[10px]">{`${task.assignedTo.firstName[0]}${task.assignedTo.lastName[0]}`.toUpperCase()}</div>
          <span className="text-slate-600">{task.assignedTo.firstName}</span>
        </div>
      ) : <span className="text-slate-400">Unassigned</span>;
    case 'dueDate':
      return <span className={clsx('text-sm', isOverdue(task) ? 'text-red-600 font-medium' : 'text-slate-500')}>{task.dueDate ? formatDate(task.dueDate) : '—'}</span>;
    case 'createdAt':
      return <span className="text-slate-500">{formatDate(task.createdAt)}</span>;
    default:
      return null;
  }
}

export default function TasksClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [columns, setColumns] = useState<string[]>(defaultColumns('task'));
  const [activeView, setActiveView] = useState<SavedView | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtersParam = filters.length > 0 ? JSON.stringify(filters) : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', { search, page, filtersParam }],
    queryFn: () => fetchTasks({ search, filters: filtersParam, page, limit: 25 }),
    placeholderData: (prev) => prev,
  });

  const toggleComplete = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api.patch(`/tasks/${id}`, { status: done ? 'completed' : 'pending' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const tasks: Task[] = data?.data ?? [];
  const pagination = data?.pagination;

  function applyView(view: SavedView | null) {
    setActiveView(view);
    setPage(1);
    if (!view) {
      setFilters([]);
      setColumns(defaultColumns('task'));
      return;
    }
    setFilters(view.filters ?? []);
    setColumns(view.columns?.length ? view.columns : defaultColumns('task'));
  }

  function toggleAll() {
    setSelectedIds((prev) => (prev.size === tasks.length ? new Set() : new Set(tasks.map((t) => t.id))));
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
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          {pagination && <p className="text-sm text-slate-500 mt-0.5">{pagination.total.toLocaleString()} tasks</p>}
        </div>
        <div className="flex items-center gap-2">
          <Can permission="tasks.create"><Link href="/tasks/new" className="btn-primary btn-sm" id="create-task-btn">
            <Plus className="h-3.5 w-3.5" /> Add Task
          </Link></Can>
        </div>
      </div>

      <div className="card">
        <SavedViewsBar
          entityType="task"
          entityLabel="tasks"
          activeView={activeView}
          current={{ filters, columns }}
          onSelect={applyView}
        />

        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              className="input pl-9"
              id="tasks-search"
              value={search}
              onChange={(e) => { setSearch((e.target as HTMLInputElement).value); setPage(1); }}
            />
          </div>
          <FilterBuilder entityType="task" value={filters} onChange={(f) => { setFilters(f); setPage(1); }} />
          <ColumnPicker entityType="task" value={columns} onChange={setColumns} />
        </div>

        {selectedIds.size > 0 && (
          <BulkActionBar
            count={selectedIds.size}
            entityLabelPlural="tasks"
            ownerField="assignedToId"
            statusOptions={STATUS_OPTIONS}
            onClear={() => setSelectedIds(new Set())}
            onUpdate={async (updates) => {
              await tasksApi.bulkUpdate([...selectedIds], updates);
              afterBulkAction();
            }}
            onDelete={async () => {
              await tasksApi.bulkDelete([...selectedIds]);
              afterBulkAction();
            }}
          />
        )}

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-center py-2">
                  <div className="skeleton h-4 w-4 rounded" />
                  <div className="skeleton h-4 flex-1 max-w-[240px]" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                  <div className="skeleton h-4 w-20" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><CheckSquare className="h-8 w-8" /></div>
              <p className="empty-state-title">No tasks found</p>
              <p className="empty-state-desc">Create your first task to get started.</p>
              <Can permission="tasks.create"><Link href="/tasks/new" className="btn-primary" id="create-first-task-btn">
                <Plus className="h-4 w-4" /> Add Task
              </Link></Can>
            </div>
          ) : (
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th className="w-10">
                    <input type="checkbox" checked={selectedIds.size === tasks.length && tasks.length > 0} onChange={toggleAll} aria-label="Select all tasks" />
                  </th>
                  <th className="w-10" />
                  <th>Task</th>
                  <th>Related To</th>
                  {columns.map((key) => {
                    const field = fieldOf(key);
                    return <th key={key}>{field.label}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const done = task.status === 'completed';
                  const relatedLabel = (task as any).lead?.title ?? (task as any).deal?.name;
                  return (
                    <tr key={task.id} className="table-row" onClick={rowNavigate(() => router.push(`/tasks/${task.id}`))}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(task.id)} onChange={() => toggleOne(task.id)} aria-label={`Select ${task.title}`} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleComplete.mutate({ id: task.id, done: !done })}
                          className="flex items-center justify-center text-slate-400 hover:text-brand-600"
                        >
                          {done ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" /> : <Circle className="h-4.5 w-4.5" />}
                        </button>
                      </td>
                      <td>
                        <Link
                          href={`/tasks/${task.id}`}
                          className={clsx(
                            'font-medium hover:text-brand-600',
                            done ? 'text-slate-400 line-through' : 'text-slate-900',
                          )}
                        >
                          {task.title}
                        </Link>
                        {task.description && <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>}
                      </td>
                      <td className="text-slate-600">{relatedLabel ?? '—'}</td>
                      {columns.map((key) => (
                        <td key={key}><TaskCell task={task} columnKey={key} /></td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-slate-500">Page {page} of {pagination.totalPages}</p>
            <div className="flex gap-1">
              <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} id="tasks-prev-page">Previous</button>
              <button className="btn-secondary btn-sm" disabled={page === pagination.totalPages} onClick={() => setPage((p) => p + 1)} id="tasks-next-page">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
