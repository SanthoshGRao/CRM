'use client';

import { Filter, Plus, X } from 'lucide-react';
import { clsx } from 'clsx';
import { Popover } from '@/components/ui/Popover';
import { RecordSelect } from '@/components/ui/RecordSelect';
import { fieldsFor, type EntityFieldDef, type FieldValueType } from '@/lib/views/entityFields';
import type { FilterCondition, FilterOperator, SavedViewEntityType } from '@crm/types';

interface OperatorDef {
  value: FilterOperator;
  label: string;
  needsValue: boolean;
}

const OPERATORS_BY_TYPE: Record<FieldValueType, OperatorDef[]> = {
  string: [
    { value: 'equals', label: 'is', needsValue: true },
    { value: 'not_equals', label: 'is not', needsValue: true },
    { value: 'contains', label: 'contains', needsValue: true },
    { value: 'is_empty', label: 'is empty', needsValue: false },
    { value: 'is_not_empty', label: 'is not empty', needsValue: false },
  ],
  number: [
    { value: 'equals', label: 'is', needsValue: true },
    { value: 'not_equals', label: 'is not', needsValue: true },
    { value: 'gt', label: 'is greater than', needsValue: true },
    { value: 'gte', label: 'is at least', needsValue: true },
    { value: 'lt', label: 'is less than', needsValue: true },
    { value: 'lte', label: 'is at most', needsValue: true },
    { value: 'is_empty', label: 'is empty', needsValue: false },
    { value: 'is_not_empty', label: 'is not empty', needsValue: false },
  ],
  date: [
    { value: 'equals', label: 'is', needsValue: true },
    { value: 'gte', label: 'is on or after', needsValue: true },
    { value: 'lte', label: 'is on or before', needsValue: true },
    { value: 'gt', label: 'is after', needsValue: true },
    { value: 'lt', label: 'is before', needsValue: true },
    { value: 'is_empty', label: 'is empty', needsValue: false },
    { value: 'is_not_empty', label: 'is not empty', needsValue: false },
  ],
  select: [
    { value: 'equals', label: 'is', needsValue: true },
    { value: 'not_equals', label: 'is not', needsValue: true },
    { value: 'in', label: 'is any of', needsValue: true },
    { value: 'is_empty', label: 'is empty', needsValue: false },
    { value: 'is_not_empty', label: 'is not empty', needsValue: false },
  ],
  record: [
    { value: 'equals', label: 'is', needsValue: true },
    { value: 'not_equals', label: 'is not', needsValue: true },
    { value: 'is_empty', label: 'is empty', needsValue: false },
    { value: 'is_not_empty', label: 'is not empty', needsValue: false },
  ],
};

interface FilterBuilderProps {
  entityType: SavedViewEntityType;
  value: FilterCondition[];
  onChange: (filters: FilterCondition[]) => void;
}

function fieldDef(entityType: SavedViewEntityType, key: string): EntityFieldDef {
  return fieldsFor(entityType).find((f) => f.key === key) ?? fieldsFor(entityType)[0];
}

export function FilterBuilder({ entityType, value, onChange }: FilterBuilderProps) {
  const fields = fieldsFor(entityType);

  function addCondition() {
    const first = fields[0];
    const op = OPERATORS_BY_TYPE[first.type][0];
    onChange([...value, { field: first.key, operator: op.value, value: '' }]);
  }

  function updateCondition(index: number, patch: Partial<FilterCondition>) {
    onChange(value.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function changeField(index: number, key: string) {
    const type = fieldDef(entityType, key).type;
    const op = OPERATORS_BY_TYPE[type][0];
    updateCondition(index, { field: key, operator: op.value, value: '' });
  }

  function removeCondition(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <Popover
      panelClassName="w-[420px] max-w-[90vw]"
      trigger={({ toggle }) => (
        <button className={clsx('btn-secondary btn-sm', value.length > 0 && 'border-brand-300 text-brand-700')} id="filter-builder-btn" onClick={toggle}>
          <Filter className="h-3.5 w-3.5" /> Filters
          {value.length > 0 && <span className="badge-blue ml-0.5 !px-1.5 !py-0">{value.length}</span>}
        </button>
      )}
    >
      {() => (
        <div className="max-h-[70vh] overflow-y-auto p-3">
          {value.length === 0 && <p className="px-1 py-2 text-sm text-slate-500">No filters yet.</p>}

          <div className="flex flex-col gap-2">
            {value.map((condition, index) => {
              const def = fieldDef(entityType, condition.field);
              const operators = OPERATORS_BY_TYPE[def.type];
              const operator = operators.find((o) => o.value === condition.operator) ?? operators[0];

              return (
                <div key={index} className="flex items-start gap-1.5">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="flex gap-1.5">
                      <select
                        className="input !py-1.5 text-xs"
                        value={condition.field}
                        onChange={(e) => changeField(index, (e.target as HTMLSelectElement).value)}
                      >
                        {fields.map((f) => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </select>
                      <select
                        className="input !py-1.5 text-xs"
                        value={operator.value}
                        onChange={(e) => updateCondition(index, { operator: (e.target as HTMLSelectElement).value as FilterOperator, value: '' })}
                      >
                        {operators.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    {operator.needsValue && (
                      <ConditionValueInput
                        field={def}
                        operator={operator.value}
                        value={condition.value}
                        onChange={(v) => updateCondition(index, { value: v })}
                      />
                    )}
                  </div>
                  <button
                    className="btn-ghost btn-sm !p-1.5"
                    aria-label="Remove filter"
                    onClick={() => removeCondition(index)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t pt-2.5">
            <button className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline" onClick={addCondition}>
              <Plus className="h-3.5 w-3.5" /> Add filter
            </button>
            {value.length > 0 && (
              <button className="text-xs text-slate-500 hover:text-slate-700" onClick={() => onChange([])}>
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </Popover>
  );
}

function ConditionValueInput({
  field,
  operator,
  value,
  onChange,
}: {
  field: EntityFieldDef;
  operator: FilterOperator;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === 'record' && field.recordSource) {
    return (
      <RecordSelect
        source={field.recordSource}
        value={typeof value === 'string' ? value : ''}
        onChange={onChange}
      />
    );
  }

  if (field.type === 'select' && field.options) {
    if (operator === 'in') {
      const selected = new Set(Array.isArray(value) ? (value as string[]) : []);
      return (
        <div className="flex flex-wrap gap-1">
          {field.options.map((opt) => {
            const active = selected.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                className={clsx(
                  'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                  active ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-surface-2',
                )}
                onClick={() => {
                  const next = new Set(selected);
                  if (active) next.delete(opt.value);
                  else next.add(opt.value);
                  onChange([...next]);
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }
    return (
      <select className="input !py-1.5 text-xs" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
        <option value="">Select…</option>
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'number') {
    return (
      <input
        type="number"
        className="input !py-1.5 text-xs"
        value={typeof value === 'string' || typeof value === 'number' ? value : ''}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
      />
    );
  }

  if (field.type === 'date') {
    return (
      <input
        type="date"
        className="input !py-1.5 text-xs"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
      />
    );
  }

  return (
    <input
      type="text"
      className="input !py-1.5 text-xs"
      placeholder="Value"
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange((e.target as HTMLInputElement).value)}
    />
  );
}
