'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customFieldsApi } from '@/lib/api/services';
import { Field } from '@/components/ui/Field';

export type CustomFieldValues = Record<string, string>;

interface CustomFieldInputsProps {
  entityType: 'contact' | 'company' | 'lead' | 'deal';
  values: CustomFieldValues;
  onChange: (values: CustomFieldValues) => void;
  /** Existing values from a record's `customFieldValues` relation. */
  initialFrom?: Array<{ fieldId: string; value: string | null }>;
}

/**
 * Renders the workspace's custom fields for an entity. Returns a plain
 * `{ fieldId: value }` map, which is what PUT /custom-fields/values expects.
 */
export function CustomFieldInputs({ entityType, values, onChange, initialFrom }: CustomFieldInputsProps) {
  const { data: fields = [], isLoading } = useQuery({
    queryKey: ['custom-fields', entityType, 'active'],
    queryFn: () => customFieldsApi.list({ entityType }),
    staleTime: 60_000,
  });

  // Seed from the record once the field definitions are known.
  useEffect(() => {
    if (!initialFrom || (fields as any[]).length === 0) return;

    const seeded: CustomFieldValues = {};
    for (const v of initialFrom) {
      if (v.value != null) seeded[v.fieldId] = v.value;
    }
    if (Object.keys(seeded).length > 0 && Object.keys(values).length === 0) {
      onChange(seeded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, initialFrom]);

  if (isLoading || (fields as any[]).length === 0) return null;

  const set = (fieldId: string, value: string) => onChange({ ...values, [fieldId]: value });

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-sm font-semibold text-slate-800">Custom fields</h3>
        <span className="text-xs text-slate-400">{(fields as any[]).length}</span>
      </div>
      <div className="card-body grid gap-4 sm:grid-cols-2">
        {(fields as any[]).map((f) => {
          const id = `cf-${f.id}`;
          const value = values[f.id] ?? '';
          const wide = ['long_text', 'multi_select'].includes(f.fieldType);

          return (
            <Field
              key={f.id}
              label={f.label}
              htmlFor={id}
              required={f.required}
              className={wide ? 'sm:col-span-2' : undefined}
            >
              {renderInput(f, id, value, set)}
            </Field>
          );
        })}
      </div>
    </div>
  );
}

function renderInput(
  field: any,
  id: string,
  value: string,
  set: (fieldId: string, value: string) => void,
) {
  const common = { id, className: 'input', required: field.required, autoComplete: 'off' };

  switch (field.fieldType) {
    case 'long_text':
      return (
        <textarea {...common} className="input min-h-[90px]" value={value}
          onChange={(e) => set(field.id, (e.target as HTMLTextAreaElement).value)} />
      );

    case 'number':
    case 'currency':
    case 'percentage':
      return (
        <input {...common} type="number" value={value}
          onChange={(e) => set(field.id, (e.target as HTMLInputElement).value)} />
      );

    case 'date':
      return (
        <input {...common} type="date" value={value}
          onChange={(e) => set(field.id, (e.target as HTMLInputElement).value)} />
      );

    case 'datetime':
      return (
        <input {...common} type="datetime-local" value={value}
          onChange={(e) => set(field.id, (e.target as HTMLInputElement).value)} />
      );

    case 'boolean':
      return (
        <select {...common} value={value} onChange={(e) => set(field.id, (e.target as HTMLSelectElement).value)}>
          <option value="">Not set</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );

    case 'dropdown':
      return (
        <select {...common} value={value} onChange={(e) => set(field.id, (e.target as HTMLSelectElement).value)}>
          <option value="">Not set</option>
          {(field.options ?? []).map((o: any) => (
            <option key={o.id ?? o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );

    case 'multi_select': {
      const picked = value ? value.split(',').map((v) => v.trim()).filter(Boolean) : [];
      return (
        <div className="flex flex-wrap gap-3 pt-1">
          {(field.options ?? []).map((o: any) => (
            <label key={o.id ?? o.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={picked.includes(o.value)}
                onChange={(e) => {
                  const next = (e.target as HTMLInputElement).checked
                    ? [...picked, o.value]
                    : picked.filter((v) => v !== o.value);
                  set(field.id, next.join(','));
                }}
              />
              {o.label}
            </label>
          ))}
        </div>
      );
    }

    case 'email':
      return (
        <input {...common} type="email" value={value}
          onChange={(e) => set(field.id, (e.target as HTMLInputElement).value)} />
      );

    case 'url':
      return (
        <input {...common} type="url" value={value} placeholder="https://"
          onChange={(e) => set(field.id, (e.target as HTMLInputElement).value)} />
      );

    case 'phone':
      return (
        <input {...common} type="tel" value={value}
          onChange={(e) => set(field.id, (e.target as HTMLInputElement).value)} />
      );

    default:
      return (
        <input {...common} type="text" value={value}
          onChange={(e) => set(field.id, (e.target as HTMLInputElement).value)} />
      );
  }
}

/** Read-only display of a record's custom field values, for detail pages. */
export function CustomFieldSummary({ values }: { values?: Array<any> }) {
  const filled = (values ?? []).filter((v) => v.value != null && v.value !== '');
  if (filled.length === 0) return null;

  return (
    <div className="card">
      <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Custom fields</h3></div>
      <div className="card-body divide-y divide-slate-100">
        {filled.map((v) => (
          <div key={v.id} className="flex items-start justify-between gap-4 py-2.5">
            <span className="text-xs font-medium text-slate-500">{v.field?.label ?? 'Field'}</span>
            <span className="text-right text-sm text-slate-800">{formatValue(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatValue(v: any): string {
  const type = v.field?.fieldType;
  const raw = String(v.value);

  if (type === 'boolean') return raw === 'true' ? 'Yes' : 'No';

  if (type === 'dropdown' || type === 'multi_select') {
    const options: any[] = v.field?.options ?? [];
    const labelFor = (val: string) => options.find((o) => o.value === val)?.label ?? val;
    return raw.split(',').map((s) => labelFor(s.trim())).join(', ');
  }

  return raw;
}
