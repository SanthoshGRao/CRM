'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, CheckSquare, Circle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';
import api from '@/lib/api/client';
import { Can } from '@/components/ui/Can';
import { formatDate } from '@/lib/utils';
import type { Task } from '@crm/types';

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

function isOverdue(task: Task) {
  return task.dueDate && task.status !== 'completed' && task.status !== 'cancelled' && new Date(task.dueDate) < new Date();
}

export default function TasksClient() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', { search, status, page }],
    queryFn: () => fetchTasks({ search, status, page, limit: 25 }),
    placeholderData: (prev) => prev,
  });

  const toggleComplete = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api.patch(`/tasks/${id}`, { status: done ? 'completed' : 'pending' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const tasks: Task[] = data?.data ?? [];
  const pagination = data?.pagination;

  const FILTERS = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
  ];

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
          <div className="flex rounded-md border border-slate-300 overflow-hidden">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                className={clsx(
                  'px-3 py-1.5 text-sm',
                  status === f.value ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-surface-2',
                )}
                onClick={() => { setStatus(f.value); setPage(1); }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

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
                  <th className="w-10" />
                  <th>Task</th>
                  <th>Related To</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const done = task.status === 'completed';
                  const related = (task as any).lead ?? (task as any).deal;
                  const relatedLabel = (task as any).lead?.title ?? (task as any).deal?.name;
                  return (
                    <tr key={task.id} className="table-row">
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
                      <td><span className={clsx('badge', PRIORITY_CLASSES[task.priority] ?? 'badge-gray')}>{task.priority}</span></td>
                      <td><span className={clsx('badge', STATUS_CLASSES[task.status] ?? 'badge-gray')}>{task.status.replace('_', ' ')}</span></td>
                      <td>
                        {(task as any).assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className="avatar-sm text-[10px]">
                              {`${(task as any).assignedTo.firstName[0]}${(task as any).assignedTo.lastName[0]}`.toUpperCase()}
                            </div>
                            <span className="text-slate-600">{(task as any).assignedTo.firstName}</span>
                          </div>
                        ) : <span className="text-slate-400">Unassigned</span>}
                      </td>
                      <td className={clsx('text-sm', isOverdue(task) ? 'text-red-600 font-medium' : 'text-slate-500')}>
                        {task.dueDate ? formatDate(task.dueDate) : '—'}
                      </td>
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
