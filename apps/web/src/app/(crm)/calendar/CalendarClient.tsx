'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react';
import { clsx } from 'clsx';
import { tasksApi } from '@/lib/api/services';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-slate-400', medium: 'bg-blue-500', high: 'bg-amber-500', urgent: 'bg-red-500',
};

/** Local YYYY-MM-DD key — avoids the UTC shift that toISOString() introduces. */
function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Six-week grid starting on the Monday on or before the 1st. */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Mon = 0
  const start = new Date(year, month, 1 - offset);

  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export default function CalendarClient() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(dayKey(today));

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', 'calendar'],
    queryFn: () => tasksApi.list({ limit: 500 }),
  });

  const tasks: any[] = (data as any)?.data ?? [];

  const byDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = dayKey(new Date(task.dueDate));
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks]);

  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const unscheduled = tasks.filter((t) => !t.dueDate);
  const selectedTasks = byDay.get(selected) ?? [];

  const monthLabel = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="page-container">
      <PageHeader
        title="Calendar"
        subtitle="Tasks plotted by due date."
        actions={
          <Link href="/tasks/new" className="btn-primary btn-sm" id="calendar-add-task">
            <Plus className="h-3.5 w-3.5" /> Add Task
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-800">{monthLabel}</h3>
            <div className="flex items-center gap-1">
              <button
                className="btn-ghost btn-sm"
                aria-label="Previous month"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                className="btn-secondary btn-sm"
                onClick={() => {
                  const now = new Date();
                  setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelected(dayKey(now));
                }}
              >
                Today
              </button>
              <button
                className="btn-ghost btn-sm"
                aria-label="Next month"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-7 gap-px text-center">
              {WEEKDAYS.map((d) => (
                <div key={d} className="pb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{d}</div>
              ))}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 42 }).map((_, i) => <div key={i} className="skeleton h-20" />)}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {grid.map((date) => {
                  const key = dayKey(date);
                  const dayTasks = byDay.get(key) ?? [];
                  const isCurrentMonth = date.getMonth() === cursor.getMonth();
                  const isToday = key === dayKey(today);

                  return (
                    <button
                      key={key}
                      onClick={() => setSelected(key)}
                      className={clsx(
                        'flex h-20 flex-col items-start gap-1 rounded-md border p-1.5 text-left transition-colors',
                        isCurrentMonth ? 'bg-white' : 'bg-surface-1 text-slate-400',
                        selected === key ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200 hover:bg-surface-2',
                      )}
                    >
                      <span className={clsx(
                        'text-xs font-medium',
                        isToday && 'flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white',
                        !isToday && isCurrentMonth && 'text-slate-700',
                      )}>
                        {date.getDate()}
                      </span>
                      <div className="flex w-full flex-col gap-0.5 overflow-hidden">
                        {dayTasks.slice(0, 2).map((t) => (
                          <span key={t.id} className="flex items-center gap-1 truncate text-[10px] text-slate-600">
                            <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', PRIORITY_DOT[t.priority] ?? 'bg-slate-400')} />
                            <span className="truncate">{t.title}</span>
                          </span>
                        ))}
                        {dayTasks.length > 2 && (
                          <span className="text-[10px] text-slate-400">+{dayTasks.length - 2} more</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-slate-800">
                {formatDate(new Date(`${selected}T00:00:00`))}
              </h3>
              <span className="text-xs text-slate-400">{selectedTasks.length} tasks</span>
            </div>
            <div className="card-body">
              {selectedTasks.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="mb-3 rounded-full bg-surface-2 p-4 text-slate-400">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-slate-500">Nothing due this day.</p>
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-slate-100">
                  {selectedTasks.map((t) => (
                    <li key={t.id} className="py-2">
                      <Link href={`/tasks/${t.id}`} className="text-sm font-medium text-slate-800 hover:text-brand-600">
                        {t.title}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        <span className="capitalize">{t.priority}</span>
                        <span>·</span>
                        <span className="capitalize">{String(t.status).replace('_', ' ')}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-slate-800">Unscheduled</h3>
              <span className="text-xs text-slate-400">{unscheduled.length}</span>
            </div>
            <div className="card-body">
              {unscheduled.length === 0 ? (
                <p className="text-sm text-slate-400">Every task has a due date.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-slate-100">
                  {unscheduled.slice(0, 10).map((t) => (
                    <li key={t.id} className="py-2">
                      <Link href={`/tasks/${t.id}`} className="text-sm text-slate-800 hover:text-brand-600">
                        {t.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
