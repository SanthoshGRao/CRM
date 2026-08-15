'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { dealsApi, customFieldsApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { Field, ErrorBanner } from '@/components/ui/Field';
import { RecordSelect } from '@/components/ui/RecordSelect';
import { CustomFieldInputs, type CustomFieldValues } from '@/components/ui/CustomFieldInputs';
import { PipelineStageSelect } from '@/components/ui/PipelineStageSelect';

export interface DealFormValues {
  name: string;
  contactId: string;
  companyId: string;
  pipelineId: string;
  stageId: string;
  ownerId: string;
  value: string;
  probability: string;
  expectedCloseDate: string;
}

const EMPTY: DealFormValues = {
  name: '', contactId: '', companyId: '', pipelineId: '', stageId: '',
  ownerId: '', value: '', probability: '', expectedCloseDate: '',
};

export function toDealFormValues(deal: any): DealFormValues {
  return {
    name: deal?.name ?? '',
    contactId: deal?.contactId ?? '',
    companyId: deal?.companyId ?? '',
    pipelineId: deal?.pipelineId ?? '',
    stageId: deal?.stageId ?? '',
    ownerId: deal?.ownerId ?? '',
    value: deal?.value != null ? String(deal.value) : '',
    probability: deal?.probability != null ? String(deal.probability) : '',
    expectedCloseDate: deal?.expectedCloseDate ? String(deal.expectedCloseDate).slice(0, 10) : '',
  };
}

function toPayload(values: DealFormValues) {
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

interface DealFormProps {
  dealId?: string;
  initialValues?: DealFormValues;
  initialCustomValues?: Array<{ fieldId: string; value: string | null }>;
  onCancel?: () => void;
  onSaved?: (deal: any) => void;
}

export function DealForm({
  dealId, initialValues, initialCustomValues, onCancel, onSaved,
}: DealFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<DealFormValues>(initialValues ?? EMPTY);
  const [customValues, setCustomValues] = useState<CustomFieldValues>({});
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof DealFormValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = toPayload(values);
      const record = dealId
        ? await dealsApi.update(dealId, payload)
        : await dealsApi.create(payload);

      // Custom values are stored separately, keyed by the record's id.
      if (Object.keys(customValues).length > 0) {
        await customFieldsApi.setValues('deal', record.id, customValues);
      }

      return record;
    },
    onSuccess: (deal: any) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      if (onSaved) onSaved(deal);
      else router.push(`/deals/${deal.id}`);
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
        <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Deal details</h3></div>
        <div className="card-body grid gap-4 sm:grid-cols-2">
          <Field label="Deal name" htmlFor="deal-name" required className="sm:col-span-2">
            <input id="deal-name" className="input" required maxLength={200} placeholder="Acme Corp — Annual Contract"
              value={values.name} onChange={(e) => set('name')((e.target as HTMLInputElement).value)} />
          </Field>

          <PipelineStageSelect
            entityType="deal"
            pipelineId={values.pipelineId}
            stageId={values.stageId}
            onChange={({ pipelineId, stageId }) => setValues((prev) => ({ ...prev, pipelineId, stageId }))}
          />

          <Field label="Contact" htmlFor="deal-contact">
            <RecordSelect id="deal-contact" source="contacts" value={values.contactId} onChange={set('contactId')} placeholder="No contact" />
          </Field>

          <Field label="Company" htmlFor="deal-company">
            <RecordSelect id="deal-company" source="companies" value={values.companyId} onChange={set('companyId')} placeholder="No company" />
          </Field>

          <Field label="Owner" htmlFor="deal-owner">
            <RecordSelect id="deal-owner" source="users" value={values.ownerId} onChange={set('ownerId')} placeholder="Unassigned" />
          </Field>

          <Field label="Value (₹)" htmlFor="deal-value">
            <input id="deal-value" type="number" min={0} className="input" placeholder="500000"
              value={values.value} onChange={(e) => set('value')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Probability (%)" htmlFor="deal-probability">
            <input id="deal-probability" type="number" min={0} max={100} className="input" placeholder="50"
              value={values.probability} onChange={(e) => set('probability')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Expected close date" htmlFor="deal-close-date">
            <input id="deal-close-date" type="date" className="input"
              value={values.expectedCloseDate} onChange={(e) => set('expectedCloseDate')((e.target as HTMLInputElement).value)} />
          </Field>
        </div>
      </div>

      <CustomFieldInputs
        entityType="deal"
        values={customValues}
        onChange={setCustomValues}
        initialFrom={initialCustomValues}
      />

      <div className="flex items-center gap-2">
        <button type="submit" className="btn-primary" id="save-deal-btn" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {dealId ? 'Save changes' : 'Create deal'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => (onCancel ? onCancel() : router.push('/deals'))}>
          Cancel
        </button>
      </div>
    </form>
  );
}
