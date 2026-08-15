'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Phone, Mail, MessageSquare, Users, StickyNote, CheckSquare,
  ArrowRightLeft, UserPlus, FilePlus2, FileEdit, Trash2, Activity as ActivityIcon, Loader2,
} from 'lucide-react';
import { activitiesApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import { ErrorBanner } from '@/components/ui/Field';

export const ACTIVITY_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  sms: MessageSquare,
  meeting: Users,
  note: StickyNote,
  task_created: CheckSquare,
  task_completed: CheckSquare,
  status_changed: ArrowRightLeft,
  stage_changed: ArrowRightLeft,
  assigned: UserPlus,
  record_created: FilePlus2,
  record_updated: FileEdit,
  record_deleted: Trash2,
};

export const LOGGABLE_TYPES = [
  { value: 'note', label: 'Note' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
];

interface ActivityTimelineProps {
  activities: any[];
  /** Which record new activities attach to, e.g. { relatedType: 'company', relatedCompanyId: id } */
  relatedType: 'contact' | 'company' | 'lead' | 'deal';
  relatedId: string;
  /** Query key to invalidate after logging. */
  invalidateKey: unknown[];
}

const RELATED_ID_FIELD: Record<string, string> = {
  contact: 'relatedContactId',
  company: 'relatedCompanyId',
  lead: 'relatedLeadId',
  deal: 'relatedDealId',
};

export function ActivityTimeline({ activities, relatedType, relatedId, invalidateKey }: ActivityTimelineProps) {
  const queryClient = useQueryClient();
  const [type, setType] = useState('note');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const logActivity = useMutation({
    mutationFn: () =>
      activitiesApi.create({
        type,
        title: title.trim(),
        relatedType,
        [RELATED_ID_FIELD[relatedType]]: relatedId,
      }),
    onSuccess: () => {
      setTitle('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: invalidateKey });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    logActivity.mutate();
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-sm font-semibold text-slate-800">Activity</h3>
        <span className="text-xs text-slate-400">{activities.length} entries</span>
      </div>

      <div className="border-b p-4">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
          <select
            className="input w-auto"
            value={type}
            onChange={(e) => setType((e.target as HTMLSelectElement).value)}
            id="activity-type"
            aria-label="Activity type"
          >
            {LOGGABLE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            type="text"
            className="input flex-1 min-w-[200px]"
            placeholder="Log a call, note or meeting…"
            value={title}
            id="activity-title"
            onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
          />
          <button type="submit" className="btn-primary btn-sm" disabled={logActivity.isPending || !title.trim()}>
            {logActivity.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Log
          </button>
        </form>
        {error && <div className="mt-3"><ErrorBanner message={error} /></div>}
      </div>

      <div className="p-4">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-3 rounded-full bg-surface-2 p-4 text-slate-400">
              <ActivityIcon className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-500">No activity yet.</p>
          </div>
        ) : (
          <ol className="relative space-y-4 border-l border-slate-200 pl-6">
            {activities.map((a) => {
              const Icon = ACTIVITY_ICONS[a.type] ?? ActivityIcon;
              return (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[34px] flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                    <Icon className="h-3 w-3" />
                  </span>
                  <p className="text-sm font-medium text-slate-800">{a.title}</p>
                  {a.description && <p className="mt-0.5 text-sm text-slate-500">{a.description}</p>}
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    {a.performedBy && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="avatar-sm h-5 w-5 text-[9px]">
                          {getInitials(a.performedBy.firstName, a.performedBy.lastName)}
                        </span>
                        {a.performedBy.firstName} {a.performedBy.lastName}
                      </span>
                    )}
                    <span>·</span>
                    <span>{formatRelativeTime(a.createdAt)}</span>
                    <span>·</span>
                    <span className="capitalize">{String(a.type).replace(/_/g, ' ')}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
