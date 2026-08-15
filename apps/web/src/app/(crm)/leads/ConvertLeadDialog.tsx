'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Building2, Loader2, User, X } from 'lucide-react';
import { leadsApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { Field, ErrorBanner } from '@/components/ui/Field';
import { RecordSelect } from '@/components/ui/RecordSelect';
import { PipelineStageSelect } from '@/components/ui/PipelineStageSelect';

interface ConvertLeadDialogProps {
  lead: any;
  onClose: () => void;
  /** Called with the created deal. Defaults to navigating to the new deal. */
  onConverted?: (deal: any) => void;
}

/**
 * Confirms the deal that will be created from a lead. The contact and company
 * always carry over; everything else here is pre-filled from the lead and can
 * be adjusted before converting.
 */
export function ConvertLeadDialog({ lead, onClose, onConverted }: ConvertLeadDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState<string>(lead?.title ?? '');
  const [pipelineId, setPipelineId] = useState('');
  const [stageId, setStageId] = useState('');
  const [ownerId, setOwnerId] = useState<string>(lead?.ownerId ?? '');
  const [value, setValue] = useState<string>(lead?.value != null ? String(lead.value) : '');
  const [expectedCloseDate, setExpectedCloseDate] = useState<string>(
    lead?.expectedCloseDate ? String(lead.expectedCloseDate).slice(0, 10) : ''
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const convert = useMutation({
    mutationFn: () =>
      leadsApi.convert(lead.id, {
        name: name.trim() || undefined,
        pipelineId: pipelineId || undefined,
        stageId: stageId || undefined,
        ownerId: ownerId || undefined,
        value: value !== '' && !Number.isNaN(Number(value)) ? Number(value) : undefined,
        expectedCloseDate: expectedCloseDate || undefined,
      }),
    onSuccess: (deal: any) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      onClose();
      if (onConverted) onConverted(deal);
      else router.push(`/deals/${deal.id}`);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    convert.mutate();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="convert-lead-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id="convert-lead-title" className="text-base font-semibold text-slate-900">
              Convert to deal
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Creates an open deal and marks this lead as converted.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-surface-2 hover:text-slate-600"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
          <ErrorBanner message={error} />

          {(lead?.contact || lead?.company) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-md bg-surface-1 px-3 py-2.5 text-xs text-slate-600">
              <span className="font-medium text-slate-500">Carried over:</span>
              {lead.contact && (
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  {lead.contact.firstName} {lead.contact.lastName}
                </span>
              )}
              {lead.company && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  {lead.company.name}
                </span>
              )}
            </div>
          )}

          <Field label="Deal name" htmlFor="convert-deal-name" required>
            <input
              id="convert-deal-name"
              className="input"
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <PipelineStageSelect
              entityType="deal"
              pipelineId={pipelineId}
              stageId={stageId}
              onChange={(next) => { setPipelineId(next.pipelineId); setStageId(next.stageId); }}
            />

            <Field label="Value (₹)" htmlFor="convert-deal-value">
              <input
                id="convert-deal-value"
                type="number"
                min={0}
                className="input"
                placeholder="0"
                value={value}
                onChange={(e) => setValue((e.target as HTMLInputElement).value)}
              />
            </Field>

            <Field label="Expected close date" htmlFor="convert-deal-close-date">
              <input
                id="convert-deal-close-date"
                type="date"
                className="input"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate((e.target as HTMLInputElement).value)}
              />
            </Field>

            <Field label="Owner" htmlFor="convert-deal-owner" className="sm:col-span-2">
              <RecordSelect
                id="convert-deal-owner"
                source="users"
                value={ownerId}
                onChange={setOwnerId}
                placeholder="Unassigned"
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-4">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={convert.isPending}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" id="confirm-convert-lead-btn" disabled={convert.isPending}>
              {convert.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ArrowRightLeft className="h-4 w-4" />}
              Convert to deal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
