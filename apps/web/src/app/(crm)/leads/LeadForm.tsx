'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { leadsApi, customFieldsApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { Field, ErrorBanner } from '@/components/ui/Field';
import { RecordSelect } from '@/components/ui/RecordSelect';
import { CustomFieldInputs, type CustomFieldValues } from '@/components/ui/CustomFieldInputs';
import { PipelineStageSelect } from '@/components/ui/PipelineStageSelect';

export const LEAD_SOURCES = [
  'website', 'referral', 'cold_call', 'email', 'social', 'advertisement', 'event', 'other',
];

export interface LeadFormValues {
  title: string;
  contactId: string;
  companyId: string;
  pipelineId: string;
  stageId: string;
  ownerId: string;
  source: string;
  value: string;
  probability: string;
  expectedCloseDate: string;
}

const EMPTY: LeadFormValues = {
  title: '', contactId: '', companyId: '', pipelineId: '', stageId: '',
  ownerId: '', source: '', value: '', probability: '', expectedCloseDate: '',
};

export function toLeadFormValues(lead: any): LeadFormValues {
  return {
    title: lead?.title ?? '',
    contactId: lead?.contactId ?? '',
    companyId: lead?.companyId ?? '',
    pipelineId: lead?.pipelineId ?? '',
    stageId: lead?.stageId ?? '',
    ownerId: lead?.ownerId ?? '',
    source: lead?.source ?? '',
    value: lead?.value != null ? String(lead.value) : '',
    probability: lead?.probability != null ? String(lead.probability) : '',
    expectedCloseDate: lead?.expectedCloseDate ? String(lead.expectedCloseDate).slice(0, 10) : '',
  };
}

function toPayload(values: LeadFormValues) {
  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(values)) {
    if (value === '' || value == null) continue;
    if (key === 'value' || key === 'probability') {
      const num = Number(value);
      if (!Number.isNaN(num)) payload[key] = num;
      continue;
    }
    payload[key] = value;
  }

  return payload;
}

interface LeadFormProps {
  leadId?: string;
  initialValues?: LeadFormValues;
  initialCustomValues?: Array<{ fieldId: string; value: string | null }>;
  onCancel?: () => void;
  onSaved?: (lead: any) => void;
}

export function LeadForm({
  leadId, initialValues, initialCustomValues, onCancel, onSaved,
}: LeadFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<LeadFormValues>(initialValues ?? EMPTY);
  const [customValues, setCustomValues] = useState<CustomFieldValues>({});
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof LeadFormValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = toPayload(values);
      const record = leadId
        ? await leadsApi.update(leadId, payload as any)
        : await leadsApi.create(payload as any);

      // Custom values are stored separately, keyed by the record's id.
      if (Object.keys(customValues).length > 0) {
        await customFieldsApi.setValues('lead', record.id, customValues);
      }

      return record;
    },
    onSuccess: (lead: any) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      if (onSaved) onSaved(lead);
      else router.push(`/leads/${lead.id}`);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.pipelineId || !values.stageId) {
      setError('Pick a pipeline and stage before saving.');
      return;
    }
    save.mutate();
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-6">
      <ErrorBanner message={error} />

      <div className="card">
        <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Lead details</h3></div>
        <div className="card-body grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="lead-title" required className="sm:col-span-2">
            <input id="lead-title" autoComplete="off" className="input" required maxLength={200} placeholder="Rahul Kumar — Real Estate Inquiry"
              value={values.title} onChange={(e) => set('title')((e.target as HTMLInputElement).value)} />
          </Field>

          <PipelineStageSelect
            entityType="lead"
            pipelineId={values.pipelineId}
            stageId={values.stageId}
            onChange={({ pipelineId, stageId }) => setValues((prev) => ({ ...prev, pipelineId, stageId }))}
          />

          <Field label="Contact" htmlFor="lead-contact">
            <RecordSelect id="lead-contact" source="contacts" value={values.contactId} onChange={set('contactId')} placeholder="No contact" />
          </Field>

          <Field label="Company" htmlFor="lead-company">
            <RecordSelect id="lead-company" source="companies" value={values.companyId} onChange={set('companyId')} placeholder="No company" />
          </Field>

          <Field label="Owner" htmlFor="lead-owner">
            <RecordSelect id="lead-owner" source="users" value={values.ownerId} onChange={set('ownerId')} placeholder="Unassigned" />
          </Field>

          <Field label="Source" htmlFor="lead-source">
            <select id="lead-source" className="input" value={values.source}
              onChange={(e) => set('source')((e.target as HTMLSelectElement).value)}>
              <option value="">Not set</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </Field>

          <Field label="Value (₹)" htmlFor="lead-value">
            <input id="lead-value" type="number" min={0} className="input" placeholder="250000"
              value={values.value} onChange={(e) => set('value')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Probability (%)" htmlFor="lead-probability">
            <input id="lead-probability" type="number" min={0} max={100} className="input" placeholder="30"
              value={values.probability} onChange={(e) => set('probability')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Expected close date" htmlFor="lead-close-date">
            <input id="lead-close-date" type="date" className="input"
              value={values.expectedCloseDate} onChange={(e) => set('expectedCloseDate')((e.target as HTMLInputElement).value)} />
          </Field>
        </div>
      </div>

      <CustomFieldInputs
        entityType="lead"
        values={customValues}
        onChange={setCustomValues}
        initialFrom={initialCustomValues}
      />

      <div className="flex items-center gap-2">
        <button type="submit" className="btn-primary" id="save-lead-btn" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {leadId ? 'Save changes' : 'Create lead'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => (onCancel ? onCancel() : router.push('/leads'))}>
          Cancel
        </button>
      </div>
    </form>
  );
}
